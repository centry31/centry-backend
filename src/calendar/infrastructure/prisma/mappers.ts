import { Event } from 'calendar/domain/event.entity';
import { EventException } from 'calendar/domain/event-exception.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

type EventRow = {
	id: string;
	title: string;
	description: string | null;

	start: Date;
	rrule: string | null;
	timeZone: string;
	duration: number;

	spaceId: string;
	createdById: string;
	detachedFromEventId: string | null;
	detachedFromOccurrenceStart: Date | null;

	createdAt: Date;
	updatedAt: Date;
};

type EventReminderRow = {
	id: string;
	eventId: string;

	offsetMinutes: number;
	nextOccurrenceStart: Date | null;
	scheduledAt: Date | null;
	sentAt: Date | null;

	createdAt: Date;
	updatedAt: Date;
};

type EventExceptionRow = {
	id: string;
	eventId: string;
	occurrenceStart: Date;
	createdAt: Date;
};

export const toEventReminderDomain = (row: EventReminderRow): EventReminder =>
	new EventReminder({
		id: row.id,
		eventId: row.eventId,

		offsetMinutes: row.offsetMinutes,
		nextOccurrenceStart: row.nextOccurrenceStart
			? DateTime.fromDate(row.nextOccurrenceStart)
			: undefined,
		scheduledAt: row.scheduledAt ? DateTime.fromDate(row.scheduledAt) : undefined,
		sentAt: row.sentAt ? DateTime.fromDate(row.sentAt) : undefined,

		createdAt: DateTime.fromDate(row.createdAt),
		updatedAt: DateTime.fromDate(row.updatedAt),
	});

export const toEventDomain = (row: EventRow, reminderRows: EventReminderRow[] = []): Event => {
	const reminders = reminderRows.map((reminderRow) => toEventReminderDomain(reminderRow));

	return new Event({
		id: row.id,
		title: row.title,
		description: row.description ?? undefined,

		start: DateTime.fromDate(row.start),
		rrule: row.rrule ?? undefined,
		timeZone: row.timeZone,
		duration: row.duration,

		spaceId: row.spaceId,
		createdById: row.createdById,
		detachedFromEventId: row.detachedFromEventId ?? undefined,
		detachedFromOccurrenceStart: row.detachedFromOccurrenceStart
			? DateTime.fromDate(row.detachedFromOccurrenceStart)
			: undefined,

		createdAt: DateTime.fromDate(row.createdAt),
		reminders,
	});
};

export const toEventPersistence = (event: Event): EventRow => ({
	id: event.id,
	title: event.title,
	description: event.description ?? null,

	start: event.start.value,
	rrule: event.rrule ?? null,
	timeZone: event.timeZone,
	duration: event.duration,

	spaceId: event.spaceId,
	createdById: event.createdById,
	detachedFromEventId: event.detachedFromEventId ?? null,
	detachedFromOccurrenceStart: event.detachedFromOccurrenceStart
		? event.detachedFromOccurrenceStart.value
		: null,

	createdAt: event.createdAt.value,
	updatedAt: new Date(),
});

export const toReminderPersistence = (reminder: EventReminder): EventReminderRow => ({
	id: reminder.id,
	eventId: reminder.eventId,

	offsetMinutes: reminder.offsetMinutes,
	nextOccurrenceStart: reminder.nextOccurrenceStart ? reminder.nextOccurrenceStart.value : null,
	scheduledAt: reminder.scheduledAt ? reminder.scheduledAt.value : null,
	sentAt: reminder.sentAt ? reminder.sentAt.value : null,

	createdAt: reminder.createdAt.value,
	updatedAt: new Date(),
});

export const toEventExceptionDomain = (row: EventExceptionRow): EventException =>
	new EventException({
		id: row.id,
		eventId: row.eventId,
		occurrenceStart: DateTime.fromDate(row.occurrenceStart),
		createdAt: DateTime.fromDate(row.createdAt),
	});
