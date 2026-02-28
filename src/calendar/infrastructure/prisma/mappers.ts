import { Event } from 'calendar/domain/event.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

/**
 * Проекция строки `event` из Prisma для адаптера репозитория.
 */
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

	createdAt: Date;
	updatedAt: Date;
};

/**
 * Проекция строки `eventReminder` из Prisma для адаптера репозитория.
 */
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

/**
 * Маппит строку reminder из persistence-слоя в доменную сущность.
 */
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

/**
 * Маппит строку события (+reminders) в доменный агрегат.
 */
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

		createdAt: DateTime.fromDate(row.createdAt),
		reminders,
	});
};

/**
 * Маппит агрегат события в формат persistence-слоя.
 */
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

	createdAt: event.createdAt.value,
	updatedAt: new Date(),
});

/**
 * Маппит reminder-сущность в формат persistence-слоя.
 */
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
