import type { Event } from 'calendar/domain/event.entity';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import type { ReminderPlanning } from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
	type ScheduleReminder,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { Inject, Injectable } from '@nestjs/common';
import { parseRruleSetOrThrow } from 'calendar/application/services/rrule/parse-rrule.helper';

const OFFSET_MINUTE_TO_MILLISECOND = 60_000;
const MAX_OCCURRENCE_SCAN = 10_000;

@Injectable()
export class ReminderPlanningService implements ReminderPlanning {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(REMINDER_SCHEDULER)
		private readonly reminderScheduler: ReminderScheduler,
	) {}

	async replanEvent(eventId: string, now: Date = new Date()): Promise<void> {
		const event = await this.eventRepository.findById(eventId);
		if (!event) {
			return;
		}

		const reminderIds = event.reminders.map((reminder) => reminder.id);
		if (reminderIds.length > 0) {
			await this.reminderScheduler.unscheduleMany(reminderIds);
		}

		const schedules: ScheduleReminder[] = [];
		for (const reminder of event.reminders) {
			const scheduledAt = this.resolveNextScheduledAt(event, reminder.offsetMinutes, now);
			if (!scheduledAt) {
				continue;
			}

			schedules.push({
				eventId: event.id,
				reminderId: reminder.id,
				scheduledAt,
			});
		}

		if (schedules.length > 0) {
			await this.reminderScheduler.scheduleMany(schedules);
		}
	}

	private resolveNextScheduledAt(event: Event, offsetMinutes: number, now: Date): Date | null {
		const offsetMillis = offsetMinutes * OFFSET_MINUTE_TO_MILLISECOND;

		if (!event.rrule) {
			const scheduledAt = new Date(event.start.value.getTime() - offsetMillis);
			return scheduledAt.getTime() > now.getTime() ? scheduledAt : null;
		}

		const parsedRrule = (() => {
			try {
				return parseRruleSetOrThrow(event.rrule);
			} catch {
				return null;
			}
		})();
		if (!parsedRrule) {
			return null;
		}

		let iteration = 0;
		let nextOccurrence = parsedRrule.after(now, true);

		while (nextOccurrence && iteration < MAX_OCCURRENCE_SCAN) {
			const scheduledAt = new Date(nextOccurrence.getTime() - offsetMillis);
			if (scheduledAt.getTime() > now.getTime()) {
				return scheduledAt;
			}

			nextOccurrence = parsedRrule.after(nextOccurrence, false);
			iteration++;
		}

		return null;
	}
}
