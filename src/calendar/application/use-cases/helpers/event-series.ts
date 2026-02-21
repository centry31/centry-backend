import type { Event, EventFrequency } from 'calendar/domain/event.entity';
import type { EventOverride } from 'calendar/domain/event-override.entity';
import type { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DomainValidationError } from 'common/domain/errors/domain.error';

const DAY_MS = 86_400_000;
const WEEK_MS = DAY_MS * 7;

/** Проверяет, что значение является корректной датой JS с конечным timestamp. */
const isValidDate = (value: Date): boolean =>
	value instanceof Date && !Number.isNaN(value.getTime());

/**
 * Возвращает `true` для FUTURE-переопределения (не удалено и не одноразовое).
 */
const isFutureOverride = (override?: EventOverride): override is EventOverride => {
	const hasOverride = Boolean(override);
	if (!hasOverride) {
		return false;
	}

	const isDeleted = override.isDeleted;
	const isOneTimeOffset = override.isOffsetOnce;
	return !isDeleted && !isOneTimeOffset;
};

/** Конкретный инстанс события, материализованный из определения серии. */
export type MaterializedEvent = {
	id: string;
	title: string;
	description: string | null;
	start: Date;
	repeatUntil: Date | null;
	duration: number;
	spaceId: string;
	createdById: string;
	frequency: EventFrequency;
	orderIndex: number;
	reminders: readonly EventReminder[];
};

type MaterializeEventsInRangeParams = {
	events: Event[];
	overridesByEventId: Record<string, EventOverride[]>;
	from: Date;
	to: Date;
};

/**
 * Материализует инстансы событий в полуинтервале `[from, to)`.
 *
 * Правила смещения:
 * - `isOffsetOnce=true`: сдвиг применяется только к текущему orderIndex.
 * - `isOffsetOnce=false`: сдвиг задает FUTURE-якорь и влияет на хвост,
 *   пока не встретится следующий FUTURE-якорь.
 */
export const materializeEventsInRange = (
	params: MaterializeEventsInRangeParams,
): MaterializedEvent[] => {
	const { events, overridesByEventId, from, to } = params;

	const isValidFrom = isValidDate(from);
	if (!isValidFrom) {
		throw new DomainValidationError('from must be a valid date');
	}
	const isValidTo = isValidDate(to);
	if (!isValidTo) {
		throw new DomainValidationError('to must be a valid date');
	}
	const isRangeInvalid = from.getTime() >= to.getTime();
	if (isRangeInvalid) {
		throw new DomainValidationError('from must be earlier than to');
	}

	const fromMillis = from.getTime();
	const toMillis = to.getTime();
	const materialized: MaterializedEvent[] = [];

	for (const event of events) {
		// Готовим быстрый доступ к переопределениям по индексу серии.
		const overrides = overridesByEventId[event.id] ?? [];
		const overrideByOrder = new Map<number, EventOverride>();
		for (const override of overrides) {
			overrideByOrder.set(override.orderIndex, override);
		}

		const maxOverrideOrder = overrides.length
			? Math.max(...overrides.map((override) => override.orderIndex))
			: -1;

		let lastOffset = 0;

		for (let orderIndex = 0; ; orderIndex += 1) {
			const isNeverOrderBeyondFirst = event.frequency === 'NEVER' && orderIndex > 0;
			if (isNeverOrderBeyondFirst) {
				break;
			}

			const baseStart = getTheoreticalStart(event.start.value, event.frequency, orderIndex);
			const override = overrideByOrder.get(orderIndex);

			// Логика lastOffset: FUTURE заменяет lastOffset, ONE его не меняет.
			let shiftForCurrent = lastOffset;
			if (override) {
				if (override.isOffsetOnce) {
					shiftForCurrent = override.offset;
				} else if (isFutureOverride(override)) {
					lastOffset = override.offset;
					shiftForCurrent = lastOffset;
				}
			}

			const start = new Date(baseStart.getTime() + shiftForCurrent);
			const repeatUntilMillis = event.repeatUntil ? event.repeatUntil.value.getTime() : null;
			const exceedsRepeatUntil =
				repeatUntilMillis !== null && start.getTime() > repeatUntilMillis;
			if (exceedsRepeatUntil) {
				break;
			}

			const isDeletedOccurrence = Boolean(override?.isDeleted);
			if (!isDeletedOccurrence) {
				const startMillis = start.getTime();
				const isWithinRequestedWindow = startMillis >= fromMillis && startMillis < toMillis;
				if (isWithinRequestedWindow) {
					// Добавляем материализованный инстанс в ответ API-слоя.
					materialized.push({
						id: event.id,
						title: event.title,
						description: event.description ?? null,
						start,
						repeatUntil: event.repeatUntil ? event.repeatUntil.value : null,
						duration: event.duration,
						spaceId: event.spaceId,
						createdById: event.createdById,
						frequency: event.frequency,
						orderIndex,
						reminders: event.reminders,
					});
				}
			}

			if (event.frequency === 'NEVER') {
				break;
			}

			// Можно завершать скан, когда:
			// 1) прошли все известные точки переопределений;
			// 2) текущий старт уже правее окна.
			const canStopScan = orderIndex > maxOverrideOrder && start.getTime() >= toMillis;
			if (canStopScan) {
				break;
			}
		}
	}

	// Стабильная сортировка по времени, затем по событию и порядку в серии.
	materialized.sort((a, b) => {
		const byStart = a.start.getTime() - b.start.getTime();
		if (byStart !== 0) {
			return byStart;
		}
		if (a.id === b.id) {
			return a.orderIndex - b.orderIndex;
		}
		return a.id.localeCompare(b.id);
	});

	return materialized;
};

/**
 * Материализует один инстанс по индексу серии с учетом цепочки переопределений и repeatUntil.
 *
 * @returns `null`, если индекс выходит за границы серии.
 */
export const materializeEventOrder = (params: {
	event: Event;
	overrides: EventOverride[];
	orderIndex: number;
}): { start: Date; isDeleted: boolean } | null => {
	const { event, overrides, orderIndex } = params;

	const hasValidOrderIndex = Number.isInteger(orderIndex) && orderIndex >= 0;
	if (!hasValidOrderIndex) {
		throw new DomainValidationError('orderIndex must be >= 0');
	}

	const isNeverOrderBeyondFirst = event.frequency === 'NEVER' && orderIndex !== 0;
	if (isNeverOrderBeyondFirst) {
		return null;
	}

	const overrideByOrder = new Map<number, EventOverride>();
	for (const override of overrides) {
		overrideByOrder.set(override.orderIndex, override);
	}

	// Последовательно восстанавливаем активный FUTURE-сдвиг до целевого индекса.
	let lastOffset = 0;
	for (let i = 0; i <= orderIndex; i += 1) {
		const baseStart = getTheoreticalStart(event.start.value, event.frequency, i);
		const override = overrideByOrder.get(i);

		let shiftForCurrent = lastOffset;
		if (override) {
			if (override.isOffsetOnce) {
				shiftForCurrent = override.offset;
			} else if (isFutureOverride(override)) {
				lastOffset = override.offset;
				shiftForCurrent = lastOffset;
			}
		}

		const start = new Date(baseStart.getTime() + shiftForCurrent);
		const exceedsRepeatUntil = event.repeatUntil
			? start.getTime() > event.repeatUntil.value.getTime()
			: false;
		if (exceedsRepeatUntil) {
			return null;
		}

		if (i === orderIndex) {
			return {
				start,
				isDeleted: Boolean(override?.isDeleted),
			};
		}
	}

	return null;
};

/** Вычисляет теоретический старт инстанса без учета сдвигов из переопределений. */
export const getTheoreticalStart = (
	baseStart: Date,
	frequency: EventFrequency,
	orderIndex: number,
): Date => {
	switch (frequency) {
		case 'NEVER':
			return new Date(baseStart.getTime());
		case 'DAILY':
			return new Date(baseStart.getTime() + orderIndex * DAY_MS);
		case 'WEEKLY':
			return new Date(baseStart.getTime() + orderIndex * WEEK_MS);
		case 'DOUBLE_WEEKLY':
			return new Date(baseStart.getTime() + orderIndex * 2 * WEEK_MS);
		case 'MONTHLY':
			return addMonthsClampedUtc(baseStart, orderIndex);
		default:
			return new Date(baseStart.getTime());
	}
};

/**
 * Добавляет месяцы в UTC с ограничением на последний день целевого месяца.
 */
const addMonthsClampedUtc = (date: Date, months: number): Date => {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth();
	const totalMonths = year * 12 + month + months;
	const targetYear = Math.floor(totalMonths / 12);
	const targetMonth = ((totalMonths % 12) + 12) % 12;
	const day = date.getUTCDate();
	const lastDayInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
	const clampedDay = Math.min(day, lastDayInTargetMonth);

	return new Date(
		Date.UTC(
			targetYear,
			targetMonth,
			clampedDay,
			date.getUTCHours(),
			date.getUTCMinutes(),
			date.getUTCSeconds(),
			date.getUTCMilliseconds(),
		),
	);
};
