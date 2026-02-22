export type ReplanReminderParams = {
	startOccurrenceHint?: Date;
	now?: Date;
};

export interface ReminderPlanning {
	replanEvent(eventId: string, now?: Date): Promise<void>;
	replanReminder(reminderId: string, params?: ReplanReminderParams): Promise<void>;
}

export const REMINDER_PLANNING = Symbol('REMINDER_PLANNING');
