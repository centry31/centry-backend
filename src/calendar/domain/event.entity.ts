import { DomainValidationError } from 'common/domain/errors/domain.error';
import type { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { EventReminder } from './event-reminder.entity';

/**
 * Данные конструктора доменной сущности {@link Event}.
 *
 * Одна и та же сущность используется для:
 * - обычного одноразового события (`rrule` не задан);
 * - корня повторяющейся серии (`rrule` задан);
 * - `detached`-переопределения одного инстанса (`detachedFrom*` заданы).
 */
type EventProps = {
	id: string;
	title: string;
	description?: string;

	start: DateTime;
	rrule?: string;
	timeZone: string;
	duration: number;

	spaceId: string;
	createdById: string;
	createdAt: DateTime;

	detachedFromEventId?: string;
	detachedFromOccurrenceStart?: DateTime;

	reminders?: EventReminder[];
};

/**
 * Корневая агрегатная сущность календарного события.
 *
 * Инварианты:
 * - `title` не пустой после trim;
 * - `timeZone` не пустой после trim;
 * - `duration` — целое положительное число минут;
 * - `detached`-связка либо полностью задана, либо полностью пуста;
 * - reminders согласованы с текущими полями планирования и старта.
 */
export class Event {
	public readonly id: string;
	public readonly spaceId: string;
	public readonly createdById: string;
	public readonly createdAt: DateTime;

	private _title: string;
	private _description?: string;
	private _start: DateTime;
	private _rrule?: string;
	private _timeZone: string;
	private _duration: number;
	private _reminders: EventReminder[];
	private _detachedFromEventId?: string;
	private _detachedFromOccurrenceStart?: DateTime;

	/**
	 * Создает агрегат события и валидирует инварианты.
	 */
	constructor(props: EventProps) {
		this.id = props.id;
		this.spaceId = props.spaceId;
		this.createdById = props.createdById;
		this.createdAt = props.createdAt;

		this._title = this.normalizeTitle(props.title);
		this._description = props.description;
		this._start = props.start;
		this._rrule = props.rrule;
		this._timeZone = this.normalizeTimeZone(props.timeZone);
		this._duration = props.duration;

		this._detachedFromEventId = props.detachedFromEventId;
		this._detachedFromOccurrenceStart = props.detachedFromOccurrenceStart;

		this._reminders = props.reminders ? props.reminders.slice() : [];

		this.ensureRemindersCoherent();
		this.ensureDurationValid(this._duration);
		this.ensureDetachedLinkCoherent();
	}

	/**
	 * Заголовок события.
	 */
	get title(): string {
		return this._title;
	}

	/**
	 * Описание события (опционально).
	 */
	get description(): string | undefined {
		return this._description;
	}

	/**
	 * Момент старта в UTC.
	 *
	 * Для корня серии это якорь серии (первый инстанс).
	 * Для `detached` это фактический новый старт переопределенного инстанса.
	 */
	get start(): DateTime {
		return this._start;
	}

	/**
	 * Каноническое RRULE-представление (`RRULE:...`) для повторяющихся событий.
	 */
	get rrule(): string | undefined {
		return this._rrule;
	}

	/**
	 * IANA-таймзона события для wall-clock семантики повторений.
	 */
	get timeZone(): string {
		return this._timeZone;
	}

	/**
	 * Длительность в минутах.
	 */
	get duration(): number {
		return this._duration;
	}

	/**
	 * Напоминания события.
	 */
	get reminders(): readonly EventReminder[] {
		return this._reminders;
	}

	/**
	 * Идентификатор исходной серии для `detached`-события.
	 */
	get detachedFromEventId(): string | undefined {
		return this._detachedFromEventId;
	}

	/**
	 * Якорь исходного инстанса для `detached`-события.
	 */
	get detachedFromOccurrenceStart(): DateTime | undefined {
		return this._detachedFromOccurrenceStart;
	}

	/**
	 * Возвращает `true`, если событие повторяющееся (есть `rrule`).
	 */
	isRecurring(): boolean {
		return Boolean(this._rrule);
	}

	/**
	 * Возвращает `true` для `detached`-переопределения одного инстанса.
	 */
	isDetached(): boolean {
		return Boolean(this._detachedFromEventId);
	}

	private normalizeTitle(title: string): string {
		const normalizedTitle = title.trim();
		if (!normalizedTitle) {
			throw new DomainValidationError('Title cannot be empty');
		}

		return normalizedTitle;
	}

	private normalizeTimeZone(timeZone: string): string {
		const normalizedTimeZone = timeZone.trim();
		if (!normalizedTimeZone) {
			throw new DomainValidationError('timeZone cannot be empty');
		}

		return normalizedTimeZone;
	}

	private ensureRemindersCoherent(): void {
		for (const reminder of this._reminders) {
			reminder.ensureCoherentWith(this._start);
		}
	}

	private ensureDurationValid(duration: number): void {
		const hasValidDuration = Number.isInteger(duration) && duration > 0;
		if (!hasValidDuration) {
			throw new DomainValidationError(
				'Duration must be a positive integer number of minutes',
			);
		}
	}

	private ensureDetachedLinkCoherent(): void {
		const hasDetachedFromEventId = Boolean(this._detachedFromEventId);
		const hasDetachedFromOccurrenceStart = Boolean(this._detachedFromOccurrenceStart);
		const hasHalfDetachedLink = hasDetachedFromEventId !== hasDetachedFromOccurrenceStart;
		if (hasHalfDetachedLink) {
			throw new DomainValidationError(
				'detachedFromEventId and detachedFromOccurrenceStart must be set together',
			);
		}
	}

	/**
	 * Обновляет заголовок с валидацией.
	 */
	changeTitle(title: string): void {
		this._title = this.normalizeTitle(title);
	}

	/**
	 * Обновляет описание.
	 */
	changeDescription(desc?: string): void {
		this._description = desc;
	}

	/**
	 * Обновляет старт и пересчитывает `scheduledAt` у reminders.
	 */
	changeStart(start: DateTime): void {
		this._start = start;
		this._reminders = this._reminders.map((reminder) => reminder.recalculateFor(start));
	}

	/**
	 * Заменяет правило повторения. `undefined` означает одноразовое событие.
	 */
	changeRecurrence(rrule?: string): void {
		this._rrule = rrule;
	}

	/**
	 * Обновляет time zone с проверкой на непустое значение.
	 */
	changeTimeZone(timeZone: string): void {
		this._timeZone = this.normalizeTimeZone(timeZone);
	}

	/**
	 * Атомарно обновляет старт и длительность, затем пересчитывает reminders.
	 */
	changeTimeRange(start: DateTime, duration: number): void {
		this.ensureDurationValid(duration);
		this._start = start;
		this._duration = duration;
		this._reminders = this._reminders.map((reminder) => reminder.recalculateFor(start));
	}

	/**
	 * Устанавливает или очищает `detached`-связку.
	 */
	setDetachedLink(detachedFromEventId?: string, detachedFromOccurrenceStart?: DateTime): void {
		this._detachedFromEventId = detachedFromEventId;
		this._detachedFromOccurrenceStart = detachedFromOccurrenceStart;
		this.ensureDetachedLinkCoherent();
	}

	/**
	 * Добавляет reminder с проверкой согласованности относительно старта.
	 */
	addReminder(reminder: EventReminder): void {
		reminder.ensureCoherentWith(this._start);
		this._reminders.push(reminder);
	}

	/**
	 * Полностью заменяет коллекцию reminders после проверок согласованности.
	 */
	replaceReminders(reminders: EventReminder[]): void {
		for (const reminder of reminders) {
			reminder.ensureCoherentWith(this._start);
		}
		this._reminders = reminders.slice();
	}

	/**
	 * Удаляет reminder по id.
	 */
	removeReminder(reminderId: string): void {
		this._reminders = this._reminders.filter((reminder) => reminder.id !== reminderId);
	}

	/**
	 * Удаляет все reminders.
	 */
	clearReminders(): void {
		this._reminders = [];
	}
}
