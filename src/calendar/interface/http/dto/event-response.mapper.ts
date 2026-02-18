import type { Event } from 'calendar/domain/event.entity';

type EventResponse = {
	id: string;
	title: string;

	description: string | null;
	start: Date;
	duration: number;

	spaceId: string;
	createdById: string;

	reminders?: EventReminderResponse[];

	frequency: Frequency;
};
type EventReminderResponse = {
	offsetMinutes: number;
};
type Frequency = 'NEVER' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export const toEventResponse = (event: Event): EventResponse => {
	const reminders: EventReminderResponse[] = event.reminders.map((reminder) => ({
		offsetMinutes: reminder.offsetMinutes,
	}));
	return {
		id: event.id,
		title: event.title,
		description: event.description,

		start: event.start.value,
		duration: event.duration,

		spaceId: event.spaceId,
		createdById: event.createdById,

		reminders,

		frequency: event.frequency,
	};
};
