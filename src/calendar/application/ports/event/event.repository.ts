import type { Event } from 'calendar/domain/event.entity';

/**
 * Модель чтения, которая нужна процессору reminders и проверке устаревания.
 */
export type ReminderPlanningState = {
	reminderId: string;
	eventId: string;
	eventTitle: string;
	spaceId: string;
	offsetMinutes: number;
	nextOccurrenceStart: Date | null;
	scheduledAt: Date | null;
};

/**
 * Контракт persistence-слоя для агрегата события и состояния планирования reminders.
 */
export interface EventRepository {
	/**
	 * Возвращает событие по id вместе с reminders.
	 */
	findById(id: string): Promise<Event | null>;
	/**
	 * Возвращает событие по id в рамках space (помощник для авторизационной границы).
	 */
	findByIdWithSpaceId(id: string, spaceId: string): Promise<Event | null>;
	/**
	 * Возвращает все события пространства, включая `detached`.
	 */
	findManyBySpaceId(spaceId: string): Promise<Event[]>;

	/**
	 * Возвращает `detached`-замену для точного исходного слота.
	 */
	findDetachedByOrigin(
		detachedFromEventId: string,
		detachedFromOccurrenceStart: Date,
	): Promise<Event | null>;
	/**
	 * Возвращает `detached`-замены, сгруппированные по id исходной серии.
	 */
	findManyDetachedByOriginEventIds(eventIds: string[]): Promise<Record<string, Event[]>>;
	/**
	 * Возвращает `detached`-замены для одной исходной серии.
	 */
	findManyDetachedByOriginEventId(eventId: string): Promise<Event[]>;

	/**
	 * Сохраняет новый агрегат события.
	 */
	create(event: Event): Promise<Event>;
	/**
	 * Полностью заменяет состояние агрегата события.
	 */
	update(event: Event): Promise<void>;
	/**
	 * Удаляет корневое событие в рамках пространства.
	 */
	delete(id: string, spaceId: string): Promise<void>;
	/**
	 * Вспомогательное batch-удаление.
	 */
	deleteByIds(ids: string[]): Promise<void>;
	/**
	 * Удаляет все `detached`-замены исходной серии и возвращает удаленные записи.
	 */
	deleteDetachedByOriginEventId(eventId: string): Promise<Event[]>;
	/**
	 * Удаляет `detached`-замену для одного исходного слота.
	 */
	deleteDetachedByOrigin(
		detachedFromEventId: string,
		detachedFromOccurrenceStart: Date,
	): Promise<Event | null>;
	/**
	 * Перепривязывает `detached` после разделения серии со старого корня на новый хвост.
	 *
	 * Возвращает ids перемещенных `detached` для перепланирования reminders.
	 */
	reassignDetachedAfterOccurrence(
		sourceEventId: string,
		targetEventId: string,
		fromOccurrenceStart: Date,
	): Promise<string[]>;

	/**
	 * Возвращает состояние планирования reminder для процессора очереди.
	 */
	findReminderPlanningState(reminderId: string): Promise<ReminderPlanningState | null>;
	/**
	 * Обновляет persist-поля планирования.
	 */
	updateReminderPlanningState(
		reminderId: string,
		data: {
			nextOccurrenceStart: Date | null;
			scheduledAt: Date | null;
		},
	): Promise<void>;
	/**
	 * Возвращает `true`, если у reminder `scheduledAt` не null.
	 */
	isReminderPending(reminderId: string): Promise<boolean>;
	/**
	 * Помечает успешную отправку reminder.
	 */
	markReminderSent(reminderId: string, sentAt?: Date): Promise<void>;
}

export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');
