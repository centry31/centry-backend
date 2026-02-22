import type { EventException } from 'calendar/domain/event-exception.entity';

export interface EventExceptionRepository {
	findByEventIds(eventIds: string[]): Promise<Record<string, EventException[]>>;
	findByEventId(eventId: string): Promise<EventException[]>;

	upsert(eventId: string, occurrenceStart: Date): Promise<void>;

	deleteByEventId(eventId: string): Promise<void>;
	deleteByEventIds(eventIds: string[]): Promise<void>;

	moveFutureToEvent(params: {
		sourceEventId: string;
		targetEventId: string;
		fromOccurrenceStart: Date;
	}): Promise<void>;
}

export const EVENT_EXCEPTION_REPOSITORY = Symbol('EVENT_EXCEPTION_REPOSITORY');
