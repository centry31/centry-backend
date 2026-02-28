import type { DateTime } from 'common/domain/value-objects/date-time.vo';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import type { ReminderJobData } from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';
import { TG_NOTIFIER, TgNotifier } from 'calendar/application/ports/tg-notifier/tg-notifier.port';

import { REMINDER_QUEUE_NAME } from './reminder-queue.constants';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { rrulestr } from 'rrule';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

/**
 * Процессор BullMQ, который отправляет reminders и перепланирует следующий инстанс.
 */
@Processor(REMINDER_QUEUE_NAME)
export class ReminderProcessor extends WorkerHost {
	private readonly logger = new Logger(ReminderProcessor.name);

	constructor(
		@Inject(TG_NOTIFIER)
		private readonly notifier: TgNotifier,

		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(SPACE_TG_CHAT_QUERY)
		private readonly spaceTgChatQuery: SpaceTgChatQuery,

		@Inject(REMINDER_SCHEDULER)
		private reminderScheduler: ReminderScheduler,
	) {
		super();
	}

	async process(job: Job<ReminderJobData>): Promise<void> {
		const data = job.data;

		const event = await this.eventRepository.findById(data.eventId);
		if (!event) {
			this.logger.warn(
				`Событие не найдено, reminderId=${data.reminderId}, eventId=${data.eventId}`,
			);
			return;
		}

		const reminder = event.reminders.find((r) => r.id === data.reminderId);
		if (!reminder) {
			this.logger.warn(
				`Напоминание не найдено у события, reminderId=${data.reminderId}, eventId=${data.eventId}`,
			);
			return;
		}

		const spaceTgChats = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(event.spaceId);
		if (!spaceTgChats.length) {
			this.logger.warn(
				`Напоминание некуда отправить, reminderId=${data.reminderId}, eventId=${data.eventId}`,
			);
			return;
		}

		const message = this.buildReminderText(event.title, event.start, reminder.offsetMinutes);

		const chatRequests = spaceTgChats.map((chat) =>
			this.notifier.send({
				chatId: chat.chatId,
				messageThreadId: chat.messageThreadId,
				text: message,
			}),
		);
		await Promise.all(chatRequests);
		await this.eventRepository.markReminderSent(reminder.id);

		if (!event.rrule) return;

		const parsedRrule = rrulestr(event.rrule, { forceset: true });
		const nextReminderDate = parsedRrule.after(new Date());

		if (!nextReminderDate) return;
		// await this.reminderScheduler.
	}

	private buildReminderText(
		title: string,
		eventStartAtIso: DateTime,
		offsetMinutes: number,
	): string {
		const startText = eventStartAtIso.toDate().toLocaleString('ru-RU');
		return `Напоминание: ${title}\nНачало: ${startText}\nЗа ${offsetMinutes} мин.`;
	}
}
