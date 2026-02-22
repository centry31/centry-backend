import type { EventException } from 'calendar/domain/event-exception.entity';

/**
 * Контракт persistence-слоя для EXDATE-подобных маркеров исключений.
 */
export interface EventExceptionRepository {
	/**
	 * Пакетная загрузка исключений с группировкой по id исходной серии.
	 */
	findByEventIds(eventIds: string[]): Promise<Record<string, EventException[]>>;
	/**
	 * Загружает исключения одной исходной серии.
	 */
	findByEventId(eventId: string): Promise<EventException[]>;

	/**
	 * Идемпотентно создает маркер исключения `(eventId, occurrenceStart)`.
	 */
	upsert(eventId: string, occurrenceStart: Date): Promise<void>;

	/**
	 * Удаляет все исключения для одной серии.
	 */
	deleteByEventId(eventId: string): Promise<void>;
	/**
	 * Пакетное удаление исключений по списку id серий.
	 */
	deleteByEventIds(eventIds: string[]): Promise<void>;

	/**
	 * Переносит будущие исключения в новую tail-серию после split.
	 */
	moveFutureToEvent(params: {
		sourceEventId: string;
		targetEventId: string;
		fromOccurrenceStart: Date;
	}): Promise<void>;
}

export const EVENT_EXCEPTION_REPOSITORY = Symbol('EVENT_EXCEPTION_REPOSITORY');
