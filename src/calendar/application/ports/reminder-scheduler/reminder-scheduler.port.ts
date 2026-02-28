export type ScheduleReminder = {
	eventId: string;
	reminderId: string;
	scheduledAt: Date;
};

export type ReminderJobData = {
	eventId: string;
	reminderId: string;
};

export interface ReminderScheduler {
	scheduleOne(cmd: ScheduleReminder): Promise<void>;
	scheduleMany(cmd: ScheduleReminder[]): Promise<void>;

	unscheduleOne(reminderId: string): Promise<void>;
	unscheduleMany(reminderId: string[]): Promise<void>;
}

export const REMINDER_SCHEDULER = Symbol('REMINDER_SCHEDULER');
