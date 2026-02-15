import * as crypto from 'crypto';

import { Event } from 'calendar/domain/event.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import { EVENT_REPOSITORY, EventRepository } from 'calendar/application/ports/event.repository';

import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

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
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(SPACE_TG_CHAT_QUERY)
		private readonly spaceTgChatQuery: SpaceTgChatQuery,
	) {}

	async execute(cmd: Cmd): Promise<Event> {
		return runUseCase(async () => {
			const hasSpaceTgChats = await this.spaceTgChatQuery.hasBySpaceId(cmd.spaceId);

			if (cmd.reminders.length > 0 && !hasSpaceTgChats) {
				throw new HttpException(
					'Для добавления напоминаний нужно привязать ТГ канал',
					HttpStatus.BAD_REQUEST,
				);
			}

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
		});
	}
}
