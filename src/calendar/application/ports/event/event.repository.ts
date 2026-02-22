import type { Event } from 'calendar/domain/event.entity';

export type ReminderPlanningState = {
	reminderId: string;
	eventId: string;
	eventTitle: string;
	spaceId: string;
	offsetMinutes: number;
	nextOccurrenceStart: Date | null;
	scheduledAt: Date | null;
};

export interface EventRepository {
	findById(id: string): Promise<Event | null>;
	findByIdWithSpaceId(id: string, spaceId: string): Promise<Event | null>;
	findManyBySpaceId(spaceId: string): Promise<Event[]>;

	findDetachedByOrigin(
		detachedFromEventId: string,
		detachedFromOccurrenceStart: Date,
	): Promise<Event | null>;
	findManyDetachedByOriginEventIds(eventIds: string[]): Promise<Record<string, Event[]>>;
	findManyDetachedByOriginEventId(eventId: string): Promise<Event[]>;

	create(event: Event): Promise<Event>;
	update(event: Event): Promise<void>;
	delete(id: string, spaceId: string): Promise<void>;
	deleteByIds(ids: string[]): Promise<void>;
	deleteDetachedByOriginEventId(eventId: string): Promise<Event[]>;
	deleteDetachedByOrigin(
		detachedFromEventId: string,
		detachedFromOccurrenceStart: Date,
	): Promise<Event | null>;
	reassignDetachedAfterOccurrence(
		sourceEventId: string,
		targetEventId: string,
		fromOccurrenceStart: Date,
	): Promise<string[]>;

	findReminderPlanningState(reminderId: string): Promise<ReminderPlanningState | null>;
	updateReminderPlanningState(
		reminderId: string,
		data: {
			nextOccurrenceStart: Date | null;
			scheduledAt: Date | null;
		},
	): Promise<void>;
	isReminderPending(reminderId: string): Promise<boolean>;
	markReminderSent(reminderId: string, sentAt?: Date): Promise<void>;
}

export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');
