import { Event } from 'calendar/domain/event.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'calendar/domain/value-objects/date-time.vo';

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

export const toEventDomain = (row: EventRow, reminders: EventReminderRow[] = []): Event => {
	const rds = reminders.map(
		(r) =>
			new EventReminder({
				id: r.id,
				eventId: r.eventId,
				offsetMinutes: r.offsetMinutes,
				scheduledAt: r.scheduledAt ? DateTime.fromDate(r.scheduledAt) : undefined,
				sentAt: r.sentAt ? DateTime.fromDate(r.sentAt) : undefined,
				createdAt: DateTime.fromDate(r.createdAt),
				updatedAt: DateTime.fromDate(r.updatedAt),
			}),
	);

	return new Event({
		id: row.id,
		title: row.title,
		description: row.description ?? undefined,
		start: DateTime.fromDate(row.start),
		end: DateTime.fromDate(row.end),
		spaceId: row.spaceId,
		createdById: row.createdById,
		createdAt: DateTime.fromDate(row.createdAt),
		reminders: rds,
	});
};

// Для записи — отдаём БЕЗ reminders:
export const toEventPersistence = (ev: Event): EventRow => ({
	id: ev.id,
	title: ev.title,
	description: ev.description ?? null,
	start: ev.start.value,
	end: ev.end.value,
	spaceId: ev.spaceId,
	createdById: ev.createdById,
	createdAt: ev.createdAt.value,
	updatedAt: new Date(),
});

export const toReminderPersistence = (rem: EventReminder, eventId: string): EventReminderRow => ({
	id: rem.id,
	eventId,
	offsetMinutes: rem.offsetMinutes,
	scheduledAt: rem.scheduledAt ? rem.scheduledAt.value : null,
	sentAt: rem.sentAt ? rem.sentAt.value : null,
	createdAt: rem.createdAt.value,
	updatedAt: new Date(),
});
