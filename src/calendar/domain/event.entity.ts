import { DomainValidationError } from 'common/domain/errors/domain.error';
import type { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { EventReminder } from './event-reminder.entity';

type Props = {
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
	private _duration: number;
	private _rrule?: string;
	private _timeZone: string;
	private _reminders: EventReminder[];

	/**
	 * Создает агрегат события и валидирует инварианты.
	 */
	constructor(props: Props) {
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

		this._reminders = props.reminders ? props.reminders.slice() : [];

		this.ensureRemindersCoherent();
		this.ensureDurationValid(this._duration);
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
	 * Возвращает `true`, если событие повторяющееся (есть `rrule`).
	 */
	isRecurring(): boolean {
		return Boolean(this._rrule);
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
	changeRrule(rrule?: string): void {
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
	}

	/**
	 * Добавляет reminder с проверкой согласованности относительно старта.
	 */
	addReminder(reminder: EventReminder): void {
		reminder.ensureCoherentWith(this._start);
		this._reminders.push(reminder);
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
