import type { DateTime } from 'common/domain/value-objects/date-time.vo';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	REMINDER_PLANNING,
	ReminderPlanning,
} from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import type { ReminderJobData } from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';
import { TG_NOTIFIER, TgNotifier } from 'calendar/application/ports/tg-notifier/tg-notifier.port';

import { REMINDER_QUEUE_NAME } from './reminder-queue.constants';

import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

type ReminderProcessResult = { replanEventId: string | null };

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

		@Inject(REMINDER_PLANNING)
		private readonly reminderPlanning: ReminderPlanning,
	) {
		super();
	}

	async process(job: Job<ReminderJobData>): Promise<ReminderProcessResult> {
		const data = job.data;

		const event = await this.eventRepository.findById(data.eventId);
		if (!event) {
			this.logger.warn(
				`Событие не найдено, reminderId=${data.reminderId}, eventId=${data.eventId}`,
			);
			return { replanEventId: null };
		}

		const reminder = event.reminders.find((r) => r.id === data.reminderId);
		if (!reminder) {
			this.logger.warn(
				`Напоминание не найдено у события, reminderId=${data.reminderId}, eventId=${data.eventId}`,
			);
			return { replanEventId: null };
		}

		const spaceTgChats = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(event.spaceId);
		if (!spaceTgChats.length) {
			this.logger.warn(
				`Напоминание некуда отправить, reminderId=${data.reminderId}, eventId=${data.eventId}`,
			);
			return { replanEventId: null };
		}

		const message = this.buildReminderText(
			event.title,
			event.start,
			event.timeZone,
			reminder.offsetMinutes,
		);

		const chatRequests = spaceTgChats.map((chat) =>
			this.notifier.send({
				chatId: chat.chatId,
				messageThreadId: chat.messageThreadId,
				text: message,
			}),
		);
		await Promise.all(chatRequests);
		await this.eventRepository.markReminderSent(reminder.id);
		return { replanEventId: event.id };
	}

	@OnWorkerEvent('completed')
	async onCompleted(_: Job<ReminderJobData>, result: ReminderProcessResult): Promise<void> {
		if (!result?.replanEventId) {
			return;
		}

		try {
			await this.reminderPlanning.replanEvent(result.replanEventId);
		} catch (error) {
			this.logger.error(
				`Ошибка перепланирования reminders, eventId=${result.replanEventId}`,
				error instanceof Error ? error.stack : String(error),
			);
		}
	}

	private buildReminderText(
		title: string,
		eventStartAtIso: DateTime,
		eventTimeZone: string,
		offsetMinutes: number,
	): string {
		const startText = eventStartAtIso.toDate().toLocaleString('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: eventTimeZone,
		});
		return `Напоминание: ${title}\nНачало: ${startText}\nЗа ${offsetMinutes} мин.`;
	}
}
