import type { Event, EventFrequency } from 'calendar/domain/event.entity';
import type { EventOverride } from 'calendar/domain/event-override.entity';

export type UpdateEventReminderInput = {
	offsetMinutes: number;
};

export type UpdateEventBranchCmd = {
	title: string;
	description?: string;

	start: Date;
	repeatUntil?: Date;
	duration: number;

	eventId: string;
	spaceId: string;

	reminders?: UpdateEventReminderInput[];
	frequency: EventFrequency;

	updateType: 'ONE' | 'FUTURE';
	orderIndex?: number;
};

export type UpdateEventMutationOperation =
	| {
			type: 'event.update';
			event: Event;
	  }
	| {
			type: 'event.create';
			event: Event;
	  }
	| {
			type: 'override.upsert';
			override: EventOverride;
	  }
	| {
			type: 'override.deleteAfter';
			eventId: string;
			orderIndex: number;
	  };

export type UpdateEventMutationPlan = {
	operations: UpdateEventMutationOperation[];
	replanEventIds: string[];
	unscheduleReminderIds: string[];
};
