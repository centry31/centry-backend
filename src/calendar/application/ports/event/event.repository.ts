import type { Event } from 'calendar/domain/event.entity';

export type ReminderPlanningState = {
	reminderId: string;
	eventId: string;
	eventTitle: string;
	spaceId: string;
	offsetMinutes: number;
	nextOrderIndex: number | null;
	nextOccurrenceStart: Date | null;
	scheduledAt: Date | null;
};

export interface EventRepository {
	findById(id: string): Promise<Event | null>;
	findByIdWithSpaceId(id: string, spaceId: string): Promise<Event | null>;
	findManyBySpaceId(spaceId: string): Promise<Event[]>;

	create(event: Event): Promise<Event>;
	update(event: Event): Promise<void>; // обновляет событие и синхронизирует напоминания
	delete(id: string, spaceId: string): Promise<void>;

	findReminderPlanningState(reminderId: string): Promise<ReminderPlanningState | null>;
	updateReminderPlanningState(
		reminderId: string,
		data: {
			nextOrderIndex: number | null;
			nextOccurrenceStart: Date | null;
			scheduledAt: Date | null;
		},
	): Promise<void>;
	isReminderPending(reminderId: string): Promise<boolean>;
	markReminderSent(reminderId: string, sentAt?: Date): Promise<void>;
}
export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');
