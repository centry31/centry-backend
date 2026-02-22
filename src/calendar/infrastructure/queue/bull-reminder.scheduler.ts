import type {
	ReminderScheduleEvent,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { REMINDER_JOB_NAME, REMINDER_QUEUE_NAME } from './reminder-queue.constants';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { Queue } from 'bullmq';

/**
 * Payload BullMQ job для отправки reminder.
 */
export type ReminderJobData = {
	reminderId: string;
	plannedOccurrenceStartAtIso: string;
	scheduledAtIso: string;
};

/**
 * Адаптер очереди для планирования reminders.
 *
 * Контракт:
 * - одна queued job на пару reminder + целевой инстанс;
 * - перед новым планированием удаляются устаревшие jobs.
 */
@Injectable()
export class BullReminderScheduler implements ReminderScheduler {
	private readonly logger = new Logger(BullReminderScheduler.name);

	constructor(@InjectQueue(REMINDER_QUEUE_NAME) private readonly queue: Queue<ReminderJobData>) {}

	/**
	 * Планирует будущую отправку и заменяет старые queued jobs этого reminder.
	 */
	async schedule(cmd: ReminderScheduleEvent): Promise<void> {
		const remindAtMillis = cmd.scheduledAt.getTime();
		const now = Date.now();

		if (remindAtMillis <= now) {
			this.logger.warn(
				`Пропуск планирования просроченного reminderId=${
					cmd.reminderId
				} remindAt=${new Date(remindAtMillis).toISOString()}`,
			);
			return;
		}

		const delay = remindAtMillis - now;
		await this.removeFutureJobsByReminderId(cmd.reminderId);
		const jobId = this.buildJobId(cmd.reminderId, cmd.plannedOccurrenceStartAt);

		await this.queue.add(
			REMINDER_JOB_NAME,
			{
				reminderId: cmd.reminderId,
				plannedOccurrenceStartAtIso: cmd.plannedOccurrenceStartAt.toISOString(),
				scheduledAtIso: cmd.scheduledAt.toISOString(),
			},
			{
				jobId,
				delay,
				attempts: 5,
				removeOnComplete: true,
				backoff: {
					type: 'exponential',
					delay: 3_000,
				},
			},
		);
	}

	/**
	 * Удаляет queued jobs для указанного reminder.
	 */
	async unschedule(reminderId: string): Promise<void> {
		await this.removeFutureJobsByReminderId(reminderId);
	}

	/**
	 * Собирает occurrence-aware job id для уникальности по целевому инстансу.
	 */
	private buildJobId(reminderId: string, plannedOccurrenceStartAt: Date): string {
		return `reminder:${reminderId}:${plannedOccurrenceStartAt.getTime()}`;
	}

	/**
	 * Удаляет jobs текущего формата и legacy-формат "одна job на reminder".
	 */
	private async removeFutureJobsByReminderId(reminderId: string): Promise<void> {
		const prefix = `reminder:${reminderId}:`;
		const legacyJobId = `reminder:${reminderId}`;
		const jobs = await this.queue.getJobs(['waiting', 'delayed', 'prioritized', 'paused']);

		for (const job of jobs) {
			const isCurrentJob = this.isReminderJob(job, prefix);
			const isLegacySingleJob = job.id === legacyJobId;
			if (isCurrentJob || isLegacySingleJob) {
				await job.remove();
			}
		}
	}

	/**
	 * Проверяет, относится ли задание очереди к reminder по префиксу id.
	 */
	private isReminderJob(job: Job<ReminderJobData>, prefix: string): boolean {
		return typeof job.id === 'string' && job.id.startsWith(prefix);
	}
}
