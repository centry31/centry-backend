import type { Event } from 'calendar/domain/event.entity';

export interface EventRepository {
	findByIdWithSpaceId(id: string, spaceId: string): Promise<Event>;
	findManyBySpaceId(spaceId: string): Promise<Event[]>;

	create(event: Event): Promise<Event>;
	update(event: Event): Promise<void>; // обновляет event + синкает reminders
	delete(id: string, spaceId: string): Promise<void>;
}
export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');
