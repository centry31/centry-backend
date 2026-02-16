import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import { TG_NOTIFIER, TgNotifier } from 'calendar/application/ports/tg-notifier/tg-notifier.port';

import type { ReminderJobData } from './bull-reminder.scheduler';
import { REMINDER_JOB_NAME, REMINDER_QUEUE_NAME } from './reminder-queue.constants';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

@Processor(REMINDER_QUEUE_NAME)
export class ReminderProcessor extends WorkerHost {
	private readonly logger = new Logger(ReminderProcessor.name);

	constructor(
		@Inject(TG_NOTIFIER)
		private readonly notifier: TgNotifier,

		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,
	) {
		super();
	}

	async process(job: Job<ReminderJobData>): Promise<void> {
		if (job.name !== REMINDER_JOB_NAME) {
			return;
		}

		const { reminderId, targets, eventTitle, eventStartAtIso, offsetMinutes } = job.data;
		const isReminderPending = await this.eventRepository.isReminderPending(reminderId);

		if (!isReminderPending) {
			this.logger.warn(`Skip reminder job ${job.id}: reminder is not pending`);
			return;
		}

		const text = this.buildReminderText(eventTitle, eventStartAtIso, offsetMinutes);

		for (const target of targets) {
			await this.notifier.send({
				chatId: target.chatId,
				messageThreadId: target.messageThreadId,
				text,
			});
		}

		await this.eventRepository.markReminderSent(reminderId);
	}

	private buildReminderText(
		title: string,
		eventStartAtIso: string,
		offsetMinutes: number,
	): string {
		const startAt = new Date(eventStartAtIso);
		const startText = Number.isNaN(startAt.getTime())
			? eventStartAtIso
			: startAt.toLocaleString('ru-RU');

		return `Напоминание: ${title}\nНачало: ${startText}\nЗа ${offsetMinutes} мин.`;
	}
}
