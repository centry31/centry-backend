import type { Event, EventFrequency } from 'calendar/domain/event.entity';
import type { EventOverride } from 'calendar/domain/event-override.entity';
import { DomainValidationError } from 'common/domain/errors/domain.error';

const DAY_MS = 86_400_000;
const WEEK_MS = DAY_MS * 7;

// Материализованный инстанс события, который отдается в API-слой.
export type MaterializedEvent = {
	id: string;
	title: string;
	description: string | null;
	start: Date;
	duration: number;
	spaceId: string;
	createdById: string;
	frequency: EventFrequency;
	orderIndex: number;
};

type MaterializeEventsInRangeParams = {
	events: Event[];
	overridesByEventId: Record<string, EventOverride[]>;
	from: Date;
	to: Date;
};

/**
 * Материализует все инстансы событий в окне [from, to).
 *
 * Правила offset:
 * - isOffsetOnce=true: offset влияет только на текущий orderIndex.
 * - isOffsetOnce=false: offset задает абсолютный future-shift
 *   для текущего и следующих индексов до следующего FUTURE.
 */
export const materializeEventsInRange = (
	params: MaterializeEventsInRangeParams,
): MaterializedEvent[] => {
	const { events, overridesByEventId, from, to } = params;

	if (!(from instanceof Date) || Number.isNaN(from.getTime())) {
		throw new DomainValidationError('from must be a valid date');
	}
	if (!(to instanceof Date) || Number.isNaN(to.getTime())) {
		throw new DomainValidationError('to must be a valid date');
	}
	if (from.getTime() >= to.getTime()) {
		throw new DomainValidationError('from must be earlier than to');
	}

	const fromMillis = from.getTime();
	const toMillis = to.getTime();
	const materialized: MaterializedEvent[] = [];

	for (const event of events) {
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
			if (event.frequency === 'NEVER' && orderIndex > 0) {
				break;
			}

			const baseStart = getTheoreticalStart(event.start.value, event.frequency, orderIndex);
			const override = overrideByOrder.get(orderIndex);

			// Логика lastOffset: FUTURE заменяет lastOffset, ONE его не меняет.
			let shiftForCurrent = lastOffset;
			if (override) {
				if (override.isOffsetOnce) {
					shiftForCurrent = override.offset;
				} else if (!override.isDeleted) {
					lastOffset = override.offset;
					shiftForCurrent = lastOffset;
				}
			}

			const start = new Date(baseStart.getTime() + shiftForCurrent);

			if (!override?.isDeleted) {
				const startMillis = start.getTime();
				if (startMillis >= fromMillis && startMillis < toMillis) {
					materialized.push({
						id: event.id,
						title: event.title,
						description: event.description ?? null,
						start,
						duration: event.duration,
						spaceId: event.spaceId,
						createdById: event.createdById,
						frequency: event.frequency,
						orderIndex,
					});
				}
			}

			if (event.frequency === 'NEVER') {
				break;
			}

			// Можно завершать скан, когда:
			// 1) прошли все known override-точки;
			// 2) текущий старт уже правее окна.
			if (orderIndex > maxOverrideOrder && start.getTime() >= toMillis) {
				break;
			}
		}
	}

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

// Теоретический старт инстанса без учета override-ов.
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

// Monthly-частота: при переполнении дня месяца делаем clamp к последнему дню.
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
