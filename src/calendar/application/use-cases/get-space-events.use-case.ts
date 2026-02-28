import { Event } from 'calendar/domain/event.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';

import { Inject, Injectable } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';
import { rrulestr } from 'rrule';

type Cmd = {
	spaceId: string;
	from: Date;
	to: Date;
};

@Injectable()
export class GetSpaceEventsUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,
	) {}

	async execute(cmd: Cmd) {
		return runUseCase(async () => {
			const calendarEvents = await this.eventRepository.findManyBySpaceId(cmd.spaceId);
			const materializedEvents: Event[] = [];

			for (const calendarEvent of calendarEvents) {
				// TODO: эти без выборки по датам отдаются
				if (!calendarEvent.rrule) {
					materializedEvents.push(calendarEvent);
					continue;
				}

				const rruleSet = rrulestr(calendarEvent.rrule, { forceset: true });
				const rruleDates = rruleSet.between(cmd.from, cmd.to);

				for (const date of rruleDates) {
					const startVo = DateTime.fromDate(date);

					const materializedEvent = new Event({
						id: calendarEvent.id,
						spaceId: calendarEvent.spaceId,
						createdById: calendarEvent.createdById,
						createdAt: calendarEvent.createdAt,
						title: calendarEvent.title,
						description: calendarEvent.description,
						start: startVo,
						rrule: calendarEvent.rrule,
						duration: calendarEvent.duration,
						timeZone: calendarEvent.timeZone,
					});

					for (const reminder of calendarEvent.reminders) {
						materializedEvent.addReminder(reminder);
					}

					materializedEvents.push(materializedEvent);
				}
			}

			return materializedEvents;
		});
	}
}
