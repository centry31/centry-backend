import * as crypto from 'crypto';

import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import { EVENT_REPOSITORY, EventRepository } from 'calendar/application/ports/event.repository';

import { HttpException, HttpStatus, Inject, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

type Cmd = {
	eventId: string;
	title: string;
	description?: string;
	start: Date;
	end: Date;
	spaceId: string;
	reminders: Reminder[];
};

type Reminder = {
	offsetMinutes: number;
};

export class UpdateEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(SPACE_TG_CHAT_QUERY)
		private readonly spaceTgChatQuery: SpaceTgChatQuery,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const hasSpaceTgChats = await this.spaceTgChatQuery.hasBySpaceId(cmd.spaceId);

			if (cmd.reminders.length > 0 && !hasSpaceTgChats) {
				throw new HttpException(
					'Для добавления напоминаний нужно привязать ТГ канал',
					HttpStatus.BAD_REQUEST,
				);
			}

			const event = await this.eventRepository.findByIdWithSpaceId(cmd.eventId, cmd.spaceId);
			if (!event) {
				throw new NotFoundException('Событие не найдено');
			}

			const startVo = DateTime.fromDate(cmd.start);
			const endVo = DateTime.fromDate(cmd.end);
			const createdAtVo = DateTime.now();

			event.changeTitle(cmd.title);
			event.changeDescription(cmd.description);
			event.changeTimeRange(startVo, endVo);
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
		});
	}
}
