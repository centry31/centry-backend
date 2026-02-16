import * as crypto from 'crypto';

import { Event } from 'calendar/domain/event.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

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

		@Inject(REMINDER_SCHEDULER)
		private readonly reminderScheduler: ReminderScheduler,
	) {}

	async execute(cmd: Cmd): Promise<Event> {
		return runUseCase(async () => {
			const activeTargets =
				cmd.reminders.length > 0
					? await this.spaceTgChatQuery.getActiveTargetsBySpaceId(cmd.spaceId)
					: [];

			if (cmd.reminders.length > 0 && activeTargets.length === 0) {
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

			const createdEvent = await this.eventRepository.create(event);

			if (createdEvent.reminders.length > 0) {
				for (const reminder of createdEvent.reminders) {
					await this.reminderScheduler.schedule({
						eventId: createdEvent.id,
						eventTitle: createdEvent.title,
						eventStartAt: createdEvent.start.value,
						reminderId: reminder.id,
						offsetMinutes: reminder.offsetMinutes,
						targets: activeTargets,
					});
				}
			}

			return createdEvent;
		});
	}
}
