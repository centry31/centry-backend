import type { Event } from 'calendar/domain/event.entity';

export interface EventRepository {
	findById(id: string): Promise<Event | null>;
	findByIdWithSpaceId(id: string, spaceId: string): Promise<Event | null>;
	findManyBySpaceId(spaceId: string): Promise<Event[]>;

	create(event: Event): Promise<Event>;
	update(event: Event): Promise<void>;
	delete(id: string, spaceId: string): Promise<void>;

	isReminderPending(reminderId: string): Promise<boolean>;
	markReminderSent(reminderId: string, sentAt?: Date): Promise<void>;
}

export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');
