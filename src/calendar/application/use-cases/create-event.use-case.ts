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
import { TG_NOTIFIER, TgNotifier } from 'calendar/application/ports/tg-notifier/tg-notifier.port';

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

	isNotifyMessage?: boolean;
	notifyMessage?: string;
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

		@Inject(TG_NOTIFIER)
		private readonly tgNotifier: TgNotifier,
	) {}

	private buildNotifyMessage = (event: Event, notifyMessage?: string) => {
		const start = event.start.value;
		const end = event.end.value;

		const formatDate = (date: Date) =>
			date.toLocaleString('ru-RU', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});

		return [
			`📅 <b>Новое событие</b>`,
			`<b>${event.title}</b>`,
			event.description ? `📝 ${event.description}` : null,
			`🕒 <b>Начало:</b> ${formatDate(start)}`,
			`⏳ <b>Конец:</b> ${formatDate(end)}`,
			notifyMessage ? `💬 ${notifyMessage}` : null,
		]
			.filter(Boolean)
			.join('\n');
	};

	async execute(cmd: Cmd): Promise<Event> {
		return runUseCase(async () => {
			const activeTargets = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(
				cmd.spaceId,
			);

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

			// TODO WARNING: тг сервис может упасть и тогда будет прикол
			if (cmd.isNotifyMessage) {
				for (const targetChat of activeTargets) {
					await this.tgNotifier.send({
						chatId: targetChat.chatId,
						messageThreadId: targetChat.messageThreadId,
						text: this.buildNotifyMessage(createdEvent, cmd.notifyMessage),
					});
				}
			}

			return createdEvent;
		});
	}
}
