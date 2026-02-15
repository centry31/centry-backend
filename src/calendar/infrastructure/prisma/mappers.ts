import { Event } from 'calendar/domain/event.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

export type EventRow = {
	id: string;
	title: string;
	description: string | null;
	start: Date;
	end: Date;
	spaceId: string;
	createdById: string;
	createdAt: Date;
	updatedAt: Date;
};
export type EventReminderRow = {
	id: string;
	eventId: string;
	offsetMinutes: number;
	scheduledAt: Date | null;
	sentAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export const toEventReminderDomain = (row: EventReminderRow): EventReminder =>
	new EventReminder({
		id: row.id,
		eventId: row.eventId,
		offsetMinutes: row.offsetMinutes,
		scheduledAt: row.scheduledAt ? DateTime.fromDate(row.scheduledAt) : undefined,
		sentAt: row.sentAt ? DateTime.fromDate(row.sentAt) : undefined,
		createdAt: DateTime.fromDate(row.createdAt),
		updatedAt: DateTime.fromDate(row.updatedAt),
	});

export const toEventDomain = (row: EventRow, reminderRows: EventReminderRow[] = []): Event => {
	const reminders = reminderRows.map((row) => toEventReminderDomain(row));

	return new Event({
		id: row.id,
		title: row.title,
		description: row.description ?? undefined,
		start: DateTime.fromDate(row.start),
		end: DateTime.fromDate(row.end),
		spaceId: row.spaceId,
		createdById: row.createdById,
		createdAt: DateTime.fromDate(row.createdAt),
		reminders,
	});
};

// Для записи — отдаём БЕЗ reminders:
export const toEventPersistence = (event: Event): EventRow => ({
	id: event.id,
	title: event.title,
	description: event.description ?? null,
	start: event.start.value,
	end: event.end.value,
	spaceId: event.spaceId,
	createdById: event.createdById,
	createdAt: event.createdAt.value,
	updatedAt: new Date(),
});

export const toReminderPersistence = (reminder: EventReminder): EventReminderRow => ({
	id: reminder.id,
	eventId: reminder.eventId,
	offsetMinutes: reminder.offsetMinutes,
	scheduledAt: reminder.scheduledAt ? reminder.scheduledAt.value : null,
	sentAt: reminder.sentAt ? reminder.sentAt.value : null,
	createdAt: reminder.createdAt.value,
	updatedAt: new Date(),
});
