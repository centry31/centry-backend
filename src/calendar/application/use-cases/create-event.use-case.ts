import * as crypto from 'crypto';

import { Event } from 'calendar/domain/event.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'calendar/domain/value-objects/date-time.vo';

import { EVENT_REPOSITORY, EventRepository } from 'calendar/application/ports/event.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	title: string;
	description: string | null;
	start: Date;
	end: Date;
	spaceId: string;
	createdById: string;
	reminders: Reminder[];
};

type Reminder = {
	offsetMinutes: number;
};

export class CreateEventUseCase {
	constructor(@Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepository) {}

	async execute(cmd: Cmd): Promise<Event> {
		const startVo = DateTime.fromDate(cmd.start);
		const endVo = DateTime.fromDate(cmd.end);
		const createdAtVo = DateTime.now();

		const event = new Event({
			id: crypto.randomUUID(),
			title: cmd.title,
			description: cmd.description,
			start: startVo,
			end: endVo,
			spaceId: cmd.spaceId,
			createdById: cmd.createdById,
			createdAt: createdAtVo,
		});
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

		return this.eventRepository.create(event);
	}
}
