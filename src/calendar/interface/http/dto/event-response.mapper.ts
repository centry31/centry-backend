import type { MaterializedEvent } from 'calendar/application/use-cases/get-space-events.use-case';

import type { Event } from 'calendar/domain/event.entity';

import type { RecurrenceConfig } from 'calendar/application/services/recurrence/recurrence.service';
import { RRule } from 'rrule';

/**
 * Форма напоминания в API-ответе.
 */
type EventReminderResponse = {
	offsetMinutes: number;
};

/**
 * Форма материализованного события в API-ответе.
 */
type EventResponse = {
	eventId: string;
	occurrenceStart: Date;
	title: string;
	description: string | null;
	start: Date;
	duration: number;
	timeZone: string;
	spaceId: string;
	createdById: string;
	recurrence: RecurrenceConfig;
	reminders: EventReminderResponse[];
};

/**
 * Парсит сохраненную строку RRULE в публичную форму DTO повторений.
 *
 * Для неподдерживаемых значений возвращает `NONE`, чтобы сохранять стабильный ответ.
 */
const parseRecurrence = (rrule?: string): RecurrenceConfig => {
	if (!rrule) {
		return { type: 'NONE' };
	}

	const parsed = RRule.parseString(rrule);
	const freq = parsed.freq;
	const interval = parsed.interval ?? 1;
	if (freq === RRule.DAILY && interval === 1) {
		return { type: 'DAILY', until: parsed.until ?? undefined };
	}
	if (freq === RRule.WEEKLY && interval === 1) {
		return { type: 'WEEKLY', until: parsed.until ?? undefined };
	}
	if (freq === RRule.WEEKLY && interval === 2) {
		return { type: 'DOUBLE_WEEKLY', until: parsed.until ?? undefined };
	}
	if (freq === RRule.MONTHLY && interval === 1) {
		return { type: 'MONTHLY', until: parsed.until ?? undefined };
	}

	return { type: 'NONE' };
};

/**
 * Маппит доменный объект события или материализованный инстанс в HTTP DTO.
 *
 * Для materialized-элементов (`GET /events`):
 * - `eventId` — id корневой серии;
 * - `occurrenceStart` — якорь исходного слота;
 * - `start` — фактический отображаемый старт (может отличаться у `detached`).
 */
export const toEventResponse = (event: Event | MaterializedEvent): EventResponse => {
	const reminders: EventReminderResponse[] = event.reminders.map((reminder) => ({
		offsetMinutes: reminder.offsetMinutes,
	}));

	if ('occurrenceStart' in event) {
		return {
			eventId: event.eventId,
			occurrenceStart: event.occurrenceStart,
			title: event.title,
			description: event.description,
			start: event.start,
			duration: event.duration,
			timeZone: event.timeZone,
			spaceId: event.spaceId,
			createdById: event.createdById,
			recurrence: event.recurrence,
			reminders,
		};
	}

	return {
		eventId: event.id,
		occurrenceStart: event.start.value,
		title: event.title,
		description: event.description ?? null,
		start: event.start.value,
		duration: event.duration,
		timeZone: event.timeZone,
		spaceId: event.spaceId,
		createdById: event.createdById,
		recurrence: parseRecurrence(event.rrule),
		reminders,
	};
};
