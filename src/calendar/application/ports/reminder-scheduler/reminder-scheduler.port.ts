export type ReminderScheduleEvent = {
	reminderId: string;
	plannedOrderIndex: number;
	plannedOccurrenceStartAt: Date;
	scheduledAt: Date;
};

export interface ReminderScheduler {
	schedule(cmd: ReminderScheduleEvent): Promise<void>;
	unschedule(reminderId: string): Promise<void>;
}

export const REMINDER_SCHEDULER = Symbol('REMINDER_SCHEDULER');
