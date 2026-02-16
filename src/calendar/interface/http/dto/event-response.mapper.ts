import type { Event } from 'calendar/domain/event.entity';

type EventResponse = {
	id: string;
	title: string;
	description: string | null;
	start: Date;
	end: Date;
	spaceId: string;
	createdById: string;
	reminders?: EventReminderResponse[];
};
type EventReminderResponse = {
	offsetMinutes: number;
};

export const toEventResponse = (event: Event): EventResponse => {
	const reminders: EventReminderResponse[] = event.reminders.map((reminder) => ({
		offsetMinutes: reminder.offsetMinutes,
	}));
	return {
		id: event.id,
		title: event.title,
		description: event.description,
		start: event.start.value,
		end: event.end.value,
		spaceId: event.spaceId,
		createdById: event.createdById,
		reminders,
	};
};
