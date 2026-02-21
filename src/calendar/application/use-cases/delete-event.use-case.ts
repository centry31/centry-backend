import * as crypto from 'crypto';

import { EventOverride } from 'calendar/domain/event-override.entity';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	EVENT_OVERRIDE_REPOSITORY,
	EventOverrideRepository,
} from 'calendar/application/ports/event-override/event-override.repository';
import {
	RECURRING_OVERRIDES,
	RecurringOverrides,
} from 'calendar/application/ports/recurring-overrides/recurring-overrides.port';
import {
	REMINDER_PLANNING,
	ReminderPlanning,
} from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
	eventId: string;
	orderIndex?: number;
};

@Injectable()
export class DeleteEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(EVENT_OVERRIDE_REPOSITORY)
		private readonly eventOverrideRepository: EventOverrideRepository,

		@Inject(REMINDER_SCHEDULER)
		private readonly reminderScheduler: ReminderScheduler,

		@Inject(REMINDER_PLANNING)
		private readonly reminderPlanningService: ReminderPlanning,

		@Inject(RECURRING_OVERRIDES)
		private readonly recurringOverrides: RecurringOverrides,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const event = await this.eventRepository.findByIdWithSpaceId(cmd.eventId, cmd.spaceId);
			if (!event) {
				throw new NotFoundException('Событие не найдено');
			}

			const hasOrderIndex = typeof cmd.orderIndex !== 'undefined';
			if (!hasOrderIndex) {
				await this.deleteWholeEvent(
					cmd.eventId,
					cmd.spaceId,
					event.reminders.map((r) => r.id),
				);
				return;
			}

			const orderIndex = this.requireValidOrderIndex(cmd.orderIndex);
			const isSingleEvent = event.frequency === 'NEVER';
			if (isSingleEvent) {
				const isValidSingleOrderIndex = orderIndex === 0;
				if (!isValidSingleOrderIndex) {
					throw new BadRequestException(
						'Для одноразового события orderIndex может быть только 0',
					);
				}

				await this.deleteWholeEvent(
					cmd.eventId,
					cmd.spaceId,
					event.reminders.map((r) => r.id),
				);
				return;
			}

			await this.deleteRecurringOccurrence(event.id, orderIndex);
		});
	}

	private requireValidOrderIndex(orderIndex?: number): number {
		const hasValidOrderIndex =
			typeof orderIndex === 'number' && Number.isInteger(orderIndex) && orderIndex >= 0;
		if (!hasValidOrderIndex) {
			throw new BadRequestException('orderIndex должен быть >= 0');
		}

		return orderIndex;
	}

	private async deleteWholeEvent(
		eventId: string,
		spaceId: string,
		reminderIds: string[],
	): Promise<void> {
		await this.eventRepository.delete(eventId, spaceId);

		for (const reminderId of reminderIds) {
			await this.reminderScheduler.unschedule(reminderId);
		}
	}

	private async deleteRecurringOccurrence(eventId: string, orderIndex: number): Promise<void> {
		const overrides = await this.eventOverrideRepository.findByEventId(eventId);
		const currentOverride = overrides.find((override) => override.orderIndex === orderIndex);

		const isFutureAnchorBeingDeleted = this.isFutureAnchorOverride(currentOverride);
		if (isFutureAnchorBeingDeleted && currentOverride) {
			const rebasedOverride = this.recurringOverrides.buildFutureAnchorAfterRemoval({
				eventId,
				removedOrderIndex: orderIndex,
				futureShift: currentOverride.offset,
				overrides,
			});
			if (rebasedOverride) {
				await this.eventOverrideRepository.upsert(rebasedOverride);
			}
		}

		const deleteOverride = new EventOverride({
			id: currentOverride?.id ?? crypto.randomUUID(),
			eventId,
			orderIndex,
			offset: 0,
			isDeleted: true,
			isOffsetOnce: true,
		});
		await this.eventOverrideRepository.upsert(deleteOverride);
		await this.reminderPlanningService.replanEvent(eventId);
	}

	private isFutureAnchorOverride(override?: EventOverride): override is EventOverride {
		if (!override) {
			return false;
		}

		const isOneTimeOffset = override.isOffsetOnce;
		const isDeleted = override.isDeleted;
		return !isOneTimeOffset && !isDeleted;
	}
}
