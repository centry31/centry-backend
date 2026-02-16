import type {
	ReminderScheduleEvent,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { REMINDER_JOB_NAME, REMINDER_QUEUE_NAME } from './reminder-queue.constants';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

export type ReminderJobData = {
	eventId: string;
	eventTitle: string;
	eventStartAtIso: string;
	reminderId: string;
	offsetMinutes: number;
	targets: {
		chatId: string;
		messageThreadId: string;
	}[];
};

@Injectable()
export class BullReminderScheduler implements ReminderScheduler {
	private readonly logger = new Logger(BullReminderScheduler.name);

	constructor(@InjectQueue(REMINDER_QUEUE_NAME) private readonly queue: Queue<ReminderJobData>) {}

	async schedule(cmd: ReminderScheduleEvent): Promise<void> {
		const remindAtMillis = cmd.eventStartAt.getTime() - cmd.offsetMinutes * 60_000;
		const now = Date.now();

		if (remindAtMillis <= now) {
			this.logger.warn(
				`Skip scheduling expired reminderId=${cmd.reminderId} eventId=${
					cmd.eventId
				} remindAt=${new Date(remindAtMillis).toISOString()}`,
			);
			return;
		}

		const delay = remindAtMillis - now;

		await this.queue.add(
			REMINDER_JOB_NAME,
			{
				eventId: cmd.eventId,
				eventTitle: cmd.eventTitle,
				eventStartAtIso: cmd.eventStartAt.toISOString(),
				reminderId: cmd.reminderId,
				offsetMinutes: cmd.offsetMinutes,
				targets: cmd.targets,
			},
			{
				jobId: this.buildJobId(cmd.reminderId),
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

	async unschedule(reminderId: string): Promise<void> {
		await this.queue.remove(this.buildJobId(reminderId));
	}

	private buildJobId(reminderId: string): string {
		return `reminder:${reminderId}`;
	}
}
