export interface ReminderPlanning {
	replanEvent(eventId: string, now?: Date): Promise<void>;
}

export const REMINDER_PLANNING = Symbol('REMINDER_PLANNING');
