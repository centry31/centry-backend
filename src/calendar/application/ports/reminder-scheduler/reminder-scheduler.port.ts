import type { SpaceTgChatTarget } from 'spaces';

export type ReminderScheduleEvent = {
	eventId: string;
	eventTitle: string;
	eventStartAt: Date;

	reminderId: string;
	offsetMinutes: number;
	targets: SpaceTgChatTarget[];
};

export interface ReminderScheduler {
	schedule(cmd: ReminderScheduleEvent): Promise<void>;
	unschedule(reminderId: string): Promise<void>;
}

export const REMINDER_SCHEDULER = Symbol('REMINDER_SCHEDULER');
