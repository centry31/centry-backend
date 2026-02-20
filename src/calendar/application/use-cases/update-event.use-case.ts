import * as crypto from 'crypto';

import type { EventFrequency } from 'calendar/domain/event.entity';
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

import { getTheoreticalStart } from './helpers/event-series';

import { HttpException, HttpStatus, Inject, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

type Cmd = {
	title: string;
	description?: string;

	start: Date;
	duration: number;

	eventId: string;
	spaceId: string;

	reminders: Reminder[];
	frequency: EventFrequency;

	updateType: 'ONE' | 'FUTURE';
	orderIndex: number;
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

				// Offset всегда считаем от "теоретического" старта по orderIndex,
				// без учета предыдущих override.
				const baseStart = getTheoreticalStart(
					event.start.value,
					event.frequency,
					cmd.orderIndex,
				);
				const offset = cmd.start.getTime() - baseStart.getTime();

				if (cmd.updateType === 'ONE') {
					const overrides = await this.eventOverrideRepository.findByEventId(event.id);
					const currentOverride = overrides.find(
						(override) => override.orderIndex === cmd.orderIndex,
					);

					if (
						currentOverride &&
						!currentOverride.isOffsetOnce &&
						!currentOverride.isDeleted
					) {
						// ONE поверх FUTURE не должен ломать хвост:
						// переносим старый future-shift на следующий индекс.
						await this.preserveFutureShiftAfterAnchorReplacement({
							eventId: event.id,
							replacedOrderIndex: cmd.orderIndex,
							futureShift: currentOverride.offset,
							overrides,
						});
					}
				}

				if (cmd.updateType === 'FUTURE') {
					await this.eventOverrideRepository.replaceFutureFromOrder(
						event.id,
						cmd.orderIndex,
						offset,
					);
					return;
				}

				const currentOverride =
					await this.eventOverrideRepository.findByEventIdAndOrderIndex(
						event.id,
						cmd.orderIndex,
					);

				const overrideToPersist = new EventOverride({
					id: currentOverride?.id ?? crypto.randomUUID(),
					eventId: event.id,
					orderIndex: cmd.orderIndex,
					offset,
					isDeleted: false,
					isOffsetOnce: true,
				});

				await this.eventOverrideRepository.upsert(overrideToPersist);
				return;
			}

			if (typeof cmd.orderIndex !== 'undefined' && cmd.orderIndex !== 0) {
				throw new HttpException(
					'Для одноразового события orderIndex может быть только 0',
					HttpStatus.BAD_REQUEST,
				);
			}

			const activeTargets = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(
				cmd.spaceId,
			);

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
		});
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

			// Уже есть следующий FUTURE-якорь — дополнительный перенос не нужен.
			return;
		}

		throw new HttpException(
			'Не удалось перестроить серию: слишком длинная цепочка override',
			HttpStatus.BAD_REQUEST,
		);
	}
}
