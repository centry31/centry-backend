import type { MaterializedEvent } from 'calendar/application/use-cases/helpers/event-series';

import type { Event, EventFrequency } from 'calendar/domain/event.entity';

type EventReminderResponse = {
	offsetMinutes: number;
};

type EventResponse = {
	id: string;
	title: string;

	description: string | null;
	start: Date;
	repeatUntil: Date | null;
	duration: number;

	spaceId: string;
	createdById: string;

	frequency: EventFrequency;
	orderIndex: number;
	reminders: EventReminderResponse[];
};

export const toEventResponse = (event: Event | MaterializedEvent): EventResponse => {
	if ('orderIndex' in event) {
		return {
			id: event.id,
			title: event.title,
			description: event.description,
			start: event.start,
			repeatUntil: event.repeatUntil,
			duration: event.duration,
			spaceId: event.spaceId,
			createdById: event.createdById,
			frequency: event.frequency,
			orderIndex: event.orderIndex,
			reminders: [],
		};
	}

	return {
		id: event.id,
		title: event.title,
		description: event.description ?? null,
		start: event.start.value,
		repeatUntil: event.repeatUntil ? event.repeatUntil.value : null,
		duration: event.duration,
		spaceId: event.spaceId,
		createdById: event.createdById,
		frequency: event.frequency,
		orderIndex: 0,
		reminders: [],
	};
};
