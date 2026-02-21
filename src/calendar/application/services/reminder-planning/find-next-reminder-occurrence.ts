import { getTheoreticalStart } from '../../use-cases/helpers/event-series';

import type { Event } from 'calendar/domain/event.entity';
import type { EventOverride } from 'calendar/domain/event-override.entity';
import { DomainValidationError } from 'common/domain/errors/domain.error';

const MAX_REMINDER_OCCURRENCE_SCAN_STEPS = 100_000;

/** Следующий запланированный инстанс для конкретной конфигурации напоминания. */
export type NextReminderOccurrence = {
	orderIndex: number;
	occurrenceStart: Date;
	scheduledAt: Date;
};

/** Возвращает `true` для FUTURE-переопределения (не удалено и не одноразовое). */
const isFutureOverride = (override?: EventOverride): override is EventOverride => {
	const hasOverride = Boolean(override);
	if (!hasOverride) {
		return false;
	}

	const isDeleted = override.isDeleted;
	const isOneTimeOffset = override.isOffsetOnce;
	return !isDeleted && !isOneTimeOffset;
};

/**
 * Находит ближайший будущий инстанс напоминания для события и смещения.
 *
 * Функция пропускает удаленные/просроченные инстансы и учитывает `repeatUntil`
 * и семантику переопределений (`ONE` / `FUTURE`).
 *
 * @returns Ближайший будущий инстанс или `null`, если будущих инстансов нет.
 */
export const findNextReminderOccurrence = (params: {
	event: Event;
	overrides: EventOverride[];
	offsetMinutes: number;
	now: Date;
	startOrderHint?: number;
}): NextReminderOccurrence | null => {
	const { event, overrides, offsetMinutes, now } = params;
	const startOrderHint = params.startOrderHint ?? 0;

	// Валидируем входные параметры перед сканированием серии.
	const hasValidOffsetMinutes = Number.isInteger(offsetMinutes) && offsetMinutes >= 0;
	if (!hasValidOffsetMinutes) {
		throw new DomainValidationError('offsetMinutes must be an integer >= 0');
	}
	const hasValidOrderHint = Number.isInteger(startOrderHint) && startOrderHint >= 0;
	if (!hasValidOrderHint) {
		throw new DomainValidationError('startOrderHint must be an integer >= 0');
	}
	const isValidNow = now instanceof Date && !Number.isNaN(now.getTime());
	if (!isValidNow) {
		throw new DomainValidationError('now must be a valid date');
	}
	const isNeverWithNonZeroHint = event.frequency === 'NEVER' && startOrderHint > 0;
	if (isNeverWithNonZeroHint) {
		return null;
	}

	const overrideByOrder = new Map<number, EventOverride>();
	for (const override of overrides) {
		overrideByOrder.set(override.orderIndex, override);
	}

	// Восстанавливаем активный FUTURE-сдвиг до стартового индекса сканирования.
	let lastOffset = 0;
	for (let order = 0; order < startOrderHint; order += 1) {
		const override = overrideByOrder.get(order);
		if (isFutureOverride(override)) {
			lastOffset = override.offset;
		}
	}

	for (
		let step = 0, orderIndex = startOrderHint;
		step < MAX_REMINDER_OCCURRENCE_SCAN_STEPS;
		step += 1, orderIndex += 1
	) {
		const isNeverOrderBeyondFirst = event.frequency === 'NEVER' && orderIndex > 0;
		if (isNeverOrderBeyondFirst) {
			return null;
		}

		const baseStart = getTheoreticalStart(event.start.value, event.frequency, orderIndex);
		const override = overrideByOrder.get(orderIndex);

		let shiftForCurrent = lastOffset;
		if (override) {
			if (override.isOffsetOnce) {
				shiftForCurrent = override.offset;
			} else if (isFutureOverride(override)) {
				lastOffset = override.offset;
				shiftForCurrent = lastOffset;
			}
		}

		const occurrenceStart = new Date(baseStart.getTime() + shiftForCurrent);
		const isAfterRepeatUntil = event.repeatUntil
			? occurrenceStart.getTime() > event.repeatUntil.value.getTime()
			: false;
		if (isAfterRepeatUntil) {
			return null;
		}

		const isOccurrenceDeleted = Boolean(override?.isDeleted);
		if (!isOccurrenceDeleted) {
			const scheduledAt = new Date(occurrenceStart.getTime() - offsetMinutes * 60_000);
			const isScheduledInFuture = scheduledAt.getTime() > now.getTime();
			if (isScheduledInFuture) {
				// Возвращаем первый валидный будущий инстанс.
				return {
					orderIndex,
					occurrenceStart,
					scheduledAt,
				};
			}
		}
	}

	throw new DomainValidationError(
		`Exceeded reminder occurrence scan limit (${MAX_REMINDER_OCCURRENCE_SCAN_STEPS})`,
	);
};
