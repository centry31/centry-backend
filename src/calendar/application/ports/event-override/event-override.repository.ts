import type { EventOverride } from 'calendar/domain/event-override.entity';

export interface EventOverrideRepository {
	upsert(cmd: EventOverride): Promise<void>;

	findByEventIds(eventIds: string[]): Promise<Record<string, EventOverride[]>>;
	findByEventId(eventId: string): Promise<EventOverride[]>;
	findByEventIdAndOrderIndex(eventId: string, orderIndex: number): Promise<EventOverride | null>;

	deleteAfterOrder(eventId: string, orderIndex: number): Promise<void>;
	replaceFutureFromOrder(eventId: string, orderIndex: number, offset: number): Promise<void>;
}

export const EVENT_OVERRIDE_REPOSITORY = Symbol('EVENT_OVERRIDE_REPOSITORY');
