import type { EventReminder } from 'calendar/domain/event-reminder.entity';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	EVENT_EXCEPTION_REPOSITORY,
	EventExceptionRepository,
} from 'calendar/application/ports/event-exception/event-exception.repository';

import { Inject, Injectable } from '@nestjs/common';
import {
	type RecurrenceConfig,
	RecurrenceService,
} from 'calendar/application/services/recurrence/recurrence.service';
import { runUseCase } from 'common/application/errors/run-use-case';

/**
 * Форма события после материализации повторений для диапазона `[from, to)`.
 */
export type MaterializedEvent = {
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
	reminders: readonly EventReminder[];
};

/**
 * Запрос на получение событий в диапазоне дат пространства.
 */
type Cmd = {
	spaceId: string;
	from: Date;
	to: Date;
};

/**
 * Материализует инстансы событий для UI/API.
 *
 * Приоритет объединения для каждого слота:
 * 1) `detached`-замена;
 * 2) исключение через exception;
 * 3) базовый инстанс корневой серии.
 */
@Injectable()
export class GetSpaceEventsUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(EVENT_EXCEPTION_REPOSITORY)
		private readonly eventExceptionRepository: EventExceptionRepository,

		private readonly recurrenceService: RecurrenceService,
	) {}

	/**
	 * Строит отсортированный список конкретных инстансов в запрошенном диапазоне.
	 */
	async execute(cmd: Cmd): Promise<MaterializedEvent[]> {
		return runUseCase(async () => {
			const events = await this.eventRepository.findManyBySpaceId(cmd.spaceId);
			const baseEvents = events.filter((event) => !event.detachedFromEventId);
			const detachedByOrigin = new Map<string, Map<number, (typeof events)[number]>>();

			for (const event of events) {
				if (!event.detachedFromEventId || !event.detachedFromOccurrenceStart) {
					continue;
				}

				if (!detachedByOrigin.has(event.detachedFromEventId)) {
					detachedByOrigin.set(event.detachedFromEventId, new Map());
				}
				detachedByOrigin
					.get(event.detachedFromEventId)
					.set(event.detachedFromOccurrenceStart.value.getTime(), event);
			}

			const exceptionsByEventId = await this.eventExceptionRepository.findByEventIds(
				baseEvents.map((event) => event.id),
			);
			const materializedEvents: MaterializedEvent[] = [];

			for (const event of baseEvents) {
				const recurrence = this.recurrenceService.parseRRule(event.rrule);
				const occurrences = this.recurrenceService.iterateOccurrencesInRange({
					start: event.start.value,
					rrule: event.rrule,
					timeZone: event.timeZone,
					from: cmd.from,
					to: cmd.to,
				});

				const detachedMap = detachedByOrigin.get(event.id) ?? new Map();
				const exceptionsSet = new Set(
					(exceptionsByEventId[event.id] ?? []).map((exception) =>
						exception.occurrenceStart.value.getTime(),
					),
				);

				for (const occurrenceStart of occurrences) {
					const occurrenceStartTime = occurrenceStart.getTime();
					const detached = detachedMap.get(occurrenceStartTime);
					if (detached) {
						materializedEvents.push({
							eventId: event.id,
							occurrenceStart,
							title: detached.title,
							description: detached.description ?? null,
							start: detached.start.value,
							duration: detached.duration,
							timeZone: detached.timeZone,
							spaceId: detached.spaceId,
							createdById: detached.createdById,
							recurrence,
							reminders: detached.reminders,
						});
						continue;
					}

					const isException = exceptionsSet.has(occurrenceStartTime);
					if (isException) {
						continue;
					}

					materializedEvents.push({
						eventId: event.id,
						occurrenceStart,
						title: event.title,
						description: event.description ?? null,
						start: occurrenceStart,
						duration: event.duration,
						timeZone: event.timeZone,
						spaceId: event.spaceId,
						createdById: event.createdById,
						recurrence,
						reminders: event.reminders,
					});
				}
			}

			materializedEvents.sort((a, b) => {
				const byStart = a.start.getTime() - b.start.getTime();
				if (byStart !== 0) {
					return byStart;
				}
				const byEvent = a.eventId.localeCompare(b.eventId);
				if (byEvent !== 0) {
					return byEvent;
				}
				return a.occurrenceStart.getTime() - b.occurrenceStart.getTime();
			});

			return materializedEvents;
		});
	}
}
