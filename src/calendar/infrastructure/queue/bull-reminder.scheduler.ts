import type {
	ReminderJobData,
	ReminderScheduler,
	ScheduleReminder,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { REMINDER_JOB_NAME, REMINDER_QUEUE_NAME } from './reminder-queue.constants';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';

// TODO: добавить логи
@Injectable()
export class BullReminderScheduler implements ReminderScheduler {
	private readonly logger = new Logger(BullReminderScheduler.name);

	constructor(@InjectQueue(REMINDER_QUEUE_NAME) private readonly queue: Queue<ReminderJobData>) {}

	async scheduleOne(scheduleReminder: ScheduleReminder): Promise<void> {
		const remindAtMillis = scheduleReminder.scheduledAt.getTime();
		const now = Date.now();

		if (remindAtMillis <= now) {
			this.logger.warn(
				`Пропуск планирования просроченного reminderId=${
					scheduleReminder.reminderId
				} remindAt=${new Date(remindAtMillis).toISOString()}`,
			);
			return;
		}

		const delay = remindAtMillis - now;

		const name = REMINDER_JOB_NAME;
		const data: ReminderJobData = {
			eventId: scheduleReminder.eventId,
			reminderId: scheduleReminder.reminderId,
		};
		const options: JobsOptions = {
			jobId: scheduleReminder.reminderId,
			delay,
			attempts: 5,
			removeOnComplete: true,
			backoff: {
				type: 'exponential',
				delay: 3_000,
			},
		};

		await this.queue.add(name, data, options);
		this.logger.log(
			`Напоминание запланировано, reminderId=${scheduleReminder.reminderId}, eventId=${scheduleReminder.eventId}`,
		);
	}
	async scheduleMany(scheduleReminders: ScheduleReminder[]): Promise<void> {
		await Promise.all(
			scheduleReminders.map((scheduleReminder) => this.scheduleOne(scheduleReminder)),
		);
	}

	async unscheduleOne(reminderId: string): Promise<void> {
		const job = await this.queue.getJob(reminderId);
		if (!job) return;
		await job.remove();
	}
	async unscheduleMany(reminderIds: string[]): Promise<void> {
		await Promise.all(reminderIds.map((reminderId) => this.unscheduleOne(reminderId)));
	}
}
