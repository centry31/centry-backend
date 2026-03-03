import * as crypto from 'crypto';

import { Event } from 'calendar/domain/event.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	REMINDER_PLANNING,
	ReminderPlanning,
} from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import { TG_NOTIFIER, TgNotifier } from 'calendar/application/ports/tg-notifier/tg-notifier.port';

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';
import { Frequency, RRule, RRuleSet } from 'rrule';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

type EventFrequency = 'NEVER' | 'DAILY' | 'WEEKLY' | 'DOUBLE_WEEKLY' | 'MONTHLY';
type Reminder = { offsetMinutes: number };
type Cmd = {
	title: string;
	description: string | null;

	start: Date;
	duration: number;
	timeZone: string;

	until?: Date;
	frequency: EventFrequency;

	spaceId: string;
	createdById: string;

	reminders: Reminder[];

	isNotifyMessage?: boolean;
	notifyMessage?: string;
};

@Injectable()
export class CreateEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(SPACE_TG_CHAT_QUERY)
		private readonly spaceTgChatQuery: SpaceTgChatQuery,

		@Inject(REMINDER_PLANNING)
		private readonly reminderPlanning: ReminderPlanning,

		@Inject(TG_NOTIFIER)
		private readonly tgNotifier: TgNotifier,
	) {}

	private buildNotifyMessage = (event: Event, notifyMessage?: string) => {
		const start = event.start.value;
		const end = new Date(start.getTime() + event.duration * 60_000);

		const formatDate = (date: Date) =>
			date.toLocaleString('ru-RU', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				timeZone: event.timeZone,
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

	private mapFrequencyToRrule = (frequency: EventFrequency) => {
		switch (frequency) {
			case 'DAILY':
				return { frequency: Frequency.DAILY, interval: 1 };
			case 'WEEKLY':
				return { frequency: Frequency.WEEKLY, interval: 1 };
			case 'DOUBLE_WEEKLY':
				return { frequency: Frequency.WEEKLY, interval: 2 };
			case 'MONTHLY':
				return { frequency: Frequency.MONTHLY, interval: 1 };
		}
	};

	async execute(cmd: Cmd): Promise<Event> {
		return runUseCase(async () => {
			const spaceTgChats = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(cmd.spaceId);

			if (cmd.reminders.length && !spaceTgChats.length) {
				throw new BadRequestException(
					'Для установки напоминаний нужно иметь привязанные Telegram чаты',
				);
			}

			const startVo = DateTime.fromDate(cmd.start);
			const createdAtVo = DateTime.now();

			if (cmd.until && DateTime.fromDate(cmd.until).isBefore(startVo)) {
				throw new BadRequestException('Конец повторения должен быть позже конца события');
			}

			const event = new Event({
				id: crypto.randomUUID(),
				spaceId: cmd.spaceId,
				createdById: cmd.createdById,

				title: cmd.title,
				description: cmd.description,

				start: startVo,
				duration: cmd.duration,
				timeZone: cmd.timeZone,

				createdAt: createdAtVo,
			});

			cmd.reminders.forEach((reminder) => {
				const eventReminder = new EventReminder({
					id: crypto.randomUUID(),
					eventId: event.id,
					createdAt: createdAtVo,
					updatedAt: createdAtVo,
					offsetMinutes: reminder.offsetMinutes,
				});
				event.addReminder(eventReminder);
			});

			if (cmd.frequency !== 'NEVER') {
				const rruleFreq = this.mapFrequencyToRrule(cmd.frequency);

				const rruleSet = new RRuleSet();
				const rrule = new RRule({
					dtstart: cmd.start,
					until: cmd.until,
					freq: rruleFreq.frequency,
					interval: rruleFreq.interval,
				});

				rruleSet.rrule(rrule);
				const rruleSetString = rruleSet.toString();
				event.changeRrule(rruleSetString);
			}

			const createdEvent = await this.eventRepository.create(event);
			await this.reminderPlanning.replanEvent(createdEvent.id);

			if (cmd.isNotifyMessage) {
				const tgRequests = spaceTgChats.map((spaceTgChat) =>
					this.tgNotifier.send({
						chatId: spaceTgChat.chatId,
						messageThreadId: spaceTgChat.messageThreadId,
						text: this.buildNotifyMessage(createdEvent, cmd.notifyMessage),
					}),
				);
				await Promise.all(tgRequests);
			}

			return createdEvent;
		});
	}
}
