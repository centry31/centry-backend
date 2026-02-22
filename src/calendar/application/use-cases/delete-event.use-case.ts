import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	EVENT_EXCEPTION_REPOSITORY,
	EventExceptionRepository,
} from 'calendar/application/ports/event-exception/event-exception.repository';
import {
	REMINDER_PLANNING,
	ReminderPlanning,
} from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RecurrenceService } from 'calendar/application/services/recurrence/recurrence.service';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
	eventId: string;
	scope?: 'SERIES' | 'THIS';
	occurrenceStart?: Date;
};

@Injectable()
export class DeleteEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(EVENT_EXCEPTION_REPOSITORY)
		private readonly eventExceptionRepository: EventExceptionRepository,

		@Inject(REMINDER_SCHEDULER)
		private readonly reminderScheduler: ReminderScheduler,

		@Inject(REMINDER_PLANNING)
		private readonly reminderPlanningService: ReminderPlanning,

		private readonly recurrenceService: RecurrenceService,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const event = await this.eventRepository.findByIdWithSpaceId(cmd.eventId, cmd.spaceId);
			if (!event) {
				throw new NotFoundException('Событие не найдено');
			}

			const scope = cmd.scope ?? 'SERIES';
			if (scope === 'SERIES' || !event.isRecurring()) {
				await this.deleteWholeEvent(event.id, cmd.spaceId);
				return;
			}

			const occurrenceStart = this.requireOccurrenceStart(cmd.occurrenceStart);
			const inSeries = this.recurrenceService.isOccurrenceInSeries({
				start: event.start.value,
				rrule: event.rrule,
				timeZone: event.timeZone,
				occurrenceStart,
			});
			if (!inSeries) {
				throw new BadRequestException('occurrenceStart не входит в серию');
			}

			await this.eventExceptionRepository.upsert(event.id, occurrenceStart);
			const deletedDetached = await this.eventRepository.deleteDetachedByOrigin(
				event.id,
				occurrenceStart,
			);
			if (deletedDetached) {
				for (const reminder of deletedDetached.reminders) {
					await this.reminderScheduler.unschedule(reminder.id);
				}
			}

			await this.reminderPlanningService.replanEvent(event.id);
		});
	}

	private requireOccurrenceStart(value?: Date): Date {
		const isValidDate = value instanceof Date && !Number.isNaN(value.getTime());
		if (!isValidDate) {
			throw new BadRequestException('occurrenceStart обязателен для scope=THIS');
		}

		return value;
	}

	private async deleteWholeEvent(eventId: string, spaceId: string): Promise<void> {
		const root = await this.eventRepository.findByIdWithSpaceId(eventId, spaceId);
		if (!root) {
			return;
		}
		const detached = await this.eventRepository.findManyDetachedByOriginEventId(root.id);
		const reminderIds = [
			...root.reminders.map((reminder) => reminder.id),
			...detached.flatMap((detachedEvent) =>
				detachedEvent.reminders.map((reminder) => reminder.id),
			),
		];

		await this.eventRepository.delete(root.id, spaceId);
		for (const reminderId of reminderIds) {
			await this.reminderScheduler.unschedule(reminderId);
		}
	}
}
