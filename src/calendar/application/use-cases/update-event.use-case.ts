import * as crypto from 'crypto';

import type { EventFrequency } from 'calendar/domain/event.entity';
import { Event } from 'calendar/domain/event.entity';
import { EventOverride } from 'calendar/domain/event-override.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	EVENT_OVERRIDE_REPOSITORY,
	EventOverrideRepository,
} from 'calendar/application/ports/event-override/event-override.repository';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { materializeEventOrder } from './helpers/event-series';

import { HttpException, HttpStatus, Inject, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

type Cmd = {
	title: string;
	description?: string;

	start: Date;
	repeatUntil?: Date;
	duration: number;

	eventId: string;
	spaceId: string;

	reminders: Reminder[];
	frequency: EventFrequency;

	updateType: 'ONE' | 'FUTURE';
	orderIndex?: number;
};

type Reminder = {
	offsetMinutes: number;
};

const MAX_OVERRIDE_REBASE_STEPS = 10_000;

export class UpdateEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,
		@Inject(EVENT_OVERRIDE_REPOSITORY)
		private readonly eventOverrideRepository: EventOverrideRepository,

		@Inject(SPACE_TG_CHAT_QUERY)
		private readonly spaceTgChatQuery: SpaceTgChatQuery,

		@Inject(REMINDER_SCHEDULER)
		private readonly reminderScheduler: ReminderScheduler,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const event = await this.eventRepository.findByIdWithSpaceId(cmd.eventId, cmd.spaceId);
			if (!event) {
				throw new NotFoundException('Событие не найдено');
			}

			if (event.frequency !== 'NEVER' && cmd.frequency !== event.frequency) {
				throw new HttpException(
					'Изменение frequency в PATCH пока не поддерживается',
					HttpStatus.BAD_REQUEST,
				);
			}

			if (event.frequency !== 'NEVER') {
				await this.updateRecurringEvent(event, cmd);
				return;
			}

			await this.updateSingleEvent(event, cmd);
		});
	}

	/**
	 * Recurring update semantics:
	 * - ONE: remove occurrence from chain (override isDeleted=true) and create detached NEVER-event.
	 * - FUTURE: cut old chain by repeatUntil and create new recurring chain from edited date.
	 */
	private async updateRecurringEvent(event: Event, cmd: Cmd): Promise<void> {
		if (cmd.reminders.length > 0) {
			throw new HttpException(
				'Для повторяющихся событий reminders в PATCH пока не поддерживаются',
				HttpStatus.BAD_REQUEST,
			);
		}

		if (!Number.isInteger(cmd.orderIndex) || cmd.orderIndex < 0) {
			throw new HttpException(
				'orderIndex обязателен для повторяющихся событий',
				HttpStatus.BAD_REQUEST,
			);
		}

		if (cmd.updateType === 'ONE') {
			await this.applyOneRecurringUpdate(event, cmd);
			return;
		}

		await this.applyFutureRecurringUpdate(event, cmd);
	}

	private async applyOneRecurringUpdate(event: Event, cmd: Cmd): Promise<void> {
		const orderIndex = cmd.orderIndex as number;
		const overrides = await this.eventOverrideRepository.findByEventId(event.id);
		const currentOverride = overrides.find((override) => override.orderIndex === orderIndex);

		if (currentOverride && !currentOverride.isOffsetOnce && !currentOverride.isDeleted) {
			// Legacy-safe behavior: if ONE replaces existing FUTURE anchor,
			// preserve that future shift for tail from next index.
			await this.preserveFutureShiftAfterAnchorReplacement({
				eventId: event.id,
				replacedOrderIndex: orderIndex,
				futureShift: currentOverride.offset,
				overrides,
			});
		}

		const detachedSingleEvent = new Event({
			id: crypto.randomUUID(),
			title: cmd.title,
			description: cmd.description ?? undefined,
			start: DateTime.fromDate(cmd.start),
			duration: cmd.duration,
			spaceId: event.spaceId,
			createdById: event.createdById,
			createdAt: DateTime.now(),
			frequency: 'NEVER',
		});
		await this.eventRepository.create(detachedSingleEvent);

		const deleteOverride = new EventOverride({
			id: currentOverride?.id ?? crypto.randomUUID(),
			eventId: event.id,
			orderIndex,
			offset: 0,
			isDeleted: true,
			isOffsetOnce: true,
		});
		await this.eventOverrideRepository.upsert(deleteOverride);
	}

	private async applyFutureRecurringUpdate(event: Event, cmd: Cmd): Promise<void> {
		const orderIndex = cmd.orderIndex as number;
		const originalRepeatUntil = event.repeatUntil;
		const nextRepeatUntil = cmd.repeatUntil
			? DateTime.fromDate(cmd.repeatUntil)
			: originalRepeatUntil;

		if (nextRepeatUntil && nextRepeatUntil.value.getTime() < cmd.start.getTime()) {
			throw new HttpException(
				'repeatUntil должен быть не раньше start для повторяющихся событий',
				HttpStatus.BAD_REQUEST,
			);
		}

		const overrides = await this.eventOverrideRepository.findByEventId(event.id);
		const occurrence = materializeEventOrder({
			event,
			overrides,
			orderIndex,
		});
		if (!occurrence) {
			throw new HttpException(
				'Некорректный orderIndex для разделения серии',
				HttpStatus.BAD_REQUEST,
			);
		}

		// FUTURE from the first occurrence can be applied in-place:
		// same semantics, no need to create an empty head-chain.
		if (orderIndex === 0) {
			event.changeTitle(cmd.title);
			event.changeDescription(cmd.description);
			event.changeTimeRange(DateTime.fromDate(cmd.start), cmd.duration);
			event.changeRepeatUntil(nextRepeatUntil);
			await this.eventRepository.update(event);
			await this.eventOverrideRepository.deleteAfterOrder(event.id, -1);
			return;
		}

		// 1) Cut old chain up to the edited occurrence (exclusive).
		event.changeRepeatUntil(DateTime.fromDate(new Date(occurrence.start.getTime() - 1)));
		await this.eventRepository.update(event);
		await this.eventOverrideRepository.deleteAfterOrder(event.id, orderIndex - 1);

		// 2) Create new recurring chain from edited occurrence with updated event data.
		const splitFutureEvent = new Event({
			id: crypto.randomUUID(),
			title: cmd.title,
			description: cmd.description ?? undefined,
			start: DateTime.fromDate(cmd.start),
			repeatUntil: nextRepeatUntil,
			duration: cmd.duration,
			spaceId: event.spaceId,
			createdById: event.createdById,
			createdAt: DateTime.now(),
			frequency: event.frequency,
		});
		await this.eventRepository.create(splitFutureEvent);
	}

	private async updateSingleEvent(event: Event, cmd: Cmd): Promise<void> {
		if (typeof cmd.orderIndex !== 'undefined' && cmd.orderIndex !== 0) {
			throw new HttpException(
				'Для одноразового события orderIndex может быть только 0',
				HttpStatus.BAD_REQUEST,
			);
		}

		const activeTargets = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(cmd.spaceId);
		if (cmd.reminders.length > 0 && activeTargets.length === 0) {
			throw new HttpException(
				'Для добавления напоминаний нужно привязать ТГ канал',
				HttpStatus.BAD_REQUEST,
			);
		}

		const previousReminderIds = event.reminders.map((reminder) => reminder.id);

		const startVo = DateTime.fromDate(cmd.start);
		const createdAtVo = DateTime.now();

		event.changeTitle(cmd.title);
		event.changeDescription(cmd.description);
		event.changeTimeRange(startVo, cmd.duration);
		event.changeFrequency(cmd.frequency);

		if (
			cmd.frequency !== 'NEVER' &&
			cmd.repeatUntil &&
			cmd.repeatUntil.getTime() < cmd.start.getTime()
		) {
			throw new HttpException(
				'repeatUntil должен быть не раньше start для повторяющихся событий',
				HttpStatus.BAD_REQUEST,
			);
		}

		event.changeRepeatUntil(
			cmd.frequency === 'NEVER'
				? undefined
				: cmd.repeatUntil
				? DateTime.fromDate(cmd.repeatUntil)
				: undefined,
		);
		event.clearReminders();

		const reminders = cmd.reminders.map(
			(reminder) =>
				new EventReminder({
					id: crypto.randomUUID(),
					eventId: event.id,
					createdAt: createdAtVo,
					offsetMinutes: reminder.offsetMinutes,
					updatedAt: createdAtVo,
				}),
		);
		reminders.forEach((reminder) => event.addReminder(reminder));

		await this.eventRepository.update(event);

		for (const reminderId of previousReminderIds) {
			await this.reminderScheduler.unschedule(reminderId);
		}

		if (event.reminders.length > 0) {
			for (const reminder of event.reminders) {
				await this.reminderScheduler.schedule({
					eventId: event.id,
					eventTitle: event.title,
					eventStartAt: event.start.value,
					reminderId: reminder.id,
					offsetMinutes: reminder.offsetMinutes,
					targets: activeTargets,
				});
			}
		}
	}

	private async preserveFutureShiftAfterAnchorReplacement(params: {
		eventId: string;
		replacedOrderIndex: number;
		futureShift: number;
		overrides: EventOverride[];
	}): Promise<void> {
		const overrideByOrder = new Map<number, EventOverride>();
		for (const override of params.overrides) {
			if (override.orderIndex > params.replacedOrderIndex) {
				overrideByOrder.set(override.orderIndex, override);
			}
		}

		for (
			let step = 0, targetOrder = params.replacedOrderIndex + 1;
			step < MAX_OVERRIDE_REBASE_STEPS;
			step += 1, targetOrder += 1
		) {
			const targetOverride = overrideByOrder.get(targetOrder);

			if (!targetOverride) {
				const newOverride = new EventOverride({
					id: crypto.randomUUID(),
					eventId: params.eventId,
					orderIndex: targetOrder,
					offset: params.futureShift,
					isDeleted: false,
					isOffsetOnce: false,
				});
				await this.eventOverrideRepository.upsert(newOverride);
				return;
			}

			if (targetOverride.isDeleted || targetOverride.isOffsetOnce) {
				continue;
			}

			// Already has next FUTURE anchor.
			return;
		}

		throw new HttpException(
			'Не удалось перестроить серию: слишком длинная цепочка override',
			HttpStatus.BAD_REQUEST,
		);
	}
}
