import type { Event } from 'calendar/domain/event.entity';
import type { EventException } from 'calendar/domain/event-exception.entity';
import { DomainValidationError } from 'common/domain/errors/domain.error';

import type { RecurrenceService } from '../recurrence/recurrence.service';

const MAX_REMINDER_OCCURRENCE_SCAN_STEPS = 100_000;

export type NextReminderOccurrence = {
	occurrenceStart: Date;
	scheduledAt: Date;
};

export const findNextReminderOccurrence = (params: {
	event: Event;
	exceptions: EventException[];
	offsetMinutes: number;
	now: Date;
	startOccurrenceHint?: Date;
	recurrenceService: RecurrenceService;
}): NextReminderOccurrence | null => {
	const { event, exceptions, offsetMinutes, now, recurrenceService } = params;
	const startOccurrenceHint = params.startOccurrenceHint;

	const hasValidOffsetMinutes = Number.isInteger(offsetMinutes) && offsetMinutes >= 0;
	if (!hasValidOffsetMinutes) {
		throw new DomainValidationError('offsetMinutes must be an integer >= 0');
	}
	const isValidNow = now instanceof Date && !Number.isNaN(now.getTime());
	if (!isValidNow) {
		throw new DomainValidationError('now must be a valid date');
	}
	const hasValidHint =
		typeof startOccurrenceHint === 'undefined' ||
		(startOccurrenceHint instanceof Date && !Number.isNaN(startOccurrenceHint.getTime()));
	if (!hasValidHint) {
		throw new DomainValidationError('startOccurrenceHint must be a valid date');
	}

	const exceptionsSet = new Set(
		exceptions.map((exception) => exception.occurrenceStart.value.getTime()),
	);
	let cursor = startOccurrenceHint ?? now;

	for (let step = 0; step < MAX_REMINDER_OCCURRENCE_SCAN_STEPS; step += 1) {
		const occurrenceStart = recurrenceService.getNextOccurrence({
			start: event.start.value,
			rrule: event.rrule,
			timeZone: event.timeZone,
			fromInclusive: cursor,
		});
		if (!occurrenceStart) {
			return null;
		}

		const occurrenceMillis = occurrenceStart.getTime();
		if (exceptionsSet.has(occurrenceMillis)) {
			cursor = new Date(occurrenceMillis + 1);
			continue;
		}

		const scheduledAt = new Date(occurrenceMillis - offsetMinutes * 60_000);
		if (scheduledAt.getTime() > now.getTime()) {
			return {
				occurrenceStart,
				scheduledAt,
			};
		}

		cursor = new Date(occurrenceMillis + 1);
	}

	throw new DomainValidationError(
		`Exceeded reminder occurrence scan limit (${MAX_REMINDER_OCCURRENCE_SCAN_STEPS})`,
	);
};
