import { Event } from 'calendar/domain/event.entity';
import { EventOverride } from 'calendar/domain/event-override.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

export type EventRow = {
	id: string;
	title: string;
	description: string | null;

	start: Date;
	repeatUntil: Date | null;
	duration: number;

	spaceId: string;
	createdById: string;

	frequency: 'NEVER' | 'DAILY' | 'WEEKLY' | 'DOUBLE_WEEKLY' | 'MONTHLY';

	createdAt: Date;
	updatedAt: Date;
};
export type EventReminderRow = {
	id: string;
	eventId: string;

	offsetMinutes: number;
	nextOrderIndex: number | null;
	nextOccurrenceStart: Date | null;
	scheduledAt: Date | null;
	sentAt: Date | null;

	createdAt: Date;
	updatedAt: Date;
};

export type EventOverridePersistenceRow = {
	id: string;
	eventId: string;
	orderIndex: number;
	offset: number;
	isDeleted: boolean;
	isOffsetOnce: boolean;
};

export const toEventReminderDomain = (row: EventReminderRow): EventReminder =>
	new EventReminder({
		id: row.id,
		eventId: row.eventId,

		offsetMinutes: row.offsetMinutes,
		nextOrderIndex: row.nextOrderIndex ?? undefined,
		nextOccurrenceStart: row.nextOccurrenceStart
			? DateTime.fromDate(row.nextOccurrenceStart)
			: undefined,
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
		repeatUntil: row.repeatUntil ? DateTime.fromDate(row.repeatUntil) : undefined,
		duration: row.duration,

		spaceId: row.spaceId,
		createdById: row.createdById,

		createdAt: DateTime.fromDate(row.createdAt),

		reminders,

		frequency: row.frequency,
	});
};

// Для записи в БД — без поля напоминаний:
export const toEventPersistence = (event: Event): EventRow => ({
	id: event.id,
	title: event.title,
	description: event.description ?? null,

	start: event.start.value,
	repeatUntil: event.repeatUntil ? event.repeatUntil.value : null,
	duration: event.duration,

	spaceId: event.spaceId,
	createdById: event.createdById,

	createdAt: event.createdAt.value,
	updatedAt: new Date(),

	frequency: event.frequency,
});

export const toReminderPersistence = (reminder: EventReminder): EventReminderRow => ({
	id: reminder.id,
	eventId: reminder.eventId,

	offsetMinutes: reminder.offsetMinutes,
	nextOrderIndex: reminder.nextOrderIndex ?? null,
	nextOccurrenceStart: reminder.nextOccurrenceStart ? reminder.nextOccurrenceStart.value : null,
	scheduledAt: reminder.scheduledAt ? reminder.scheduledAt.value : null,
	sentAt: reminder.sentAt ? reminder.sentAt.value : null,

	createdAt: reminder.createdAt.value,
	updatedAt: new Date(),
});

export const toEventOverrideDomain = (row: EventOverridePersistenceRow): EventOverride =>
	new EventOverride({
		id: row.id,
		eventId: row.eventId,

		orderIndex: row.orderIndex,
		offset: row.offset,

		isDeleted: row.isDeleted,
		isOffsetOnce: row.isOffsetOnce,
	});
