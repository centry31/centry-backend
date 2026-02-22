import { DomainValidationError } from 'common/domain/errors/domain.error';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

/**
 * Данные конструктора доменной сущности {@link EventReminder}.
 */
type EventReminderProps = {
	id: string;
	eventId: string;
	offsetMinutes: number;
	nextOccurrenceStart?: DateTime;
	scheduledAt?: DateTime;
	sentAt?: DateTime;
	createdAt: DateTime;
	updatedAt: DateTime;
};

/**
 * Сущность напоминания, привязанного к событию.
 *
 * Модель планирования:
 * - `nextOccurrenceStart`: следующий целевой инстанс;
 * - `scheduledAt`: когда нужно отправить напоминание для этого инстанса.
 */
export class EventReminder {
	public readonly id: string;
	public readonly eventId: string;
	public readonly offsetMinutes: number;
	public readonly createdAt: DateTime;
	public readonly updatedAt: DateTime;

	private readonly _nextOccurrenceStart?: DateTime;
	private _scheduledAt?: DateTime;
	private _sentAt?: DateTime;

	/**
	 * Создает reminder и проверяет, что offset не отрицательный.
	 */
	constructor(props: EventReminderProps) {
		const hasInvalidOffset = props.offsetMinutes < 0;
		if (hasInvalidOffset) {
			throw new DomainValidationError('offsetMinutes must be >= 0');
		}

		this.id = props.id;
		this.eventId = props.eventId;
		this.offsetMinutes = props.offsetMinutes;
		this._nextOccurrenceStart = props.nextOccurrenceStart;
		this._scheduledAt = props.scheduledAt;
		this._sentAt = props.sentAt;
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
	}

	/**
	 * Текущий запланированный инстанс.
	 */
	get nextOccurrenceStart(): DateTime | undefined {
		return this._nextOccurrenceStart;
	}

	/**
	 * Запланированное время выполнения в очереди.
	 */
	get scheduledAt(): DateTime | undefined {
		return this._scheduledAt;
	}

	/**
	 * Время последней успешной отправки.
	 */
	get sentAt(): DateTime | undefined {
		return this._sentAt;
	}

	/**
	 * Проверяет, что `scheduledAt = базовыйИнстанс - offsetMinutes`.
	 *
	 * Базовый инстанс — это `nextOccurrenceStart` (если он есть),
	 * иначе `eventStart`.
	 */
	ensureCoherentWith(eventStart: DateTime): void {
		const scheduledAt = this._scheduledAt;
		const hasScheduledAt = Boolean(scheduledAt);
		if (!hasScheduledAt) {
			return;
		}

		const expectedBase = this._nextOccurrenceStart ?? eventStart;
		const expected = expectedBase.addMinutes(-this.offsetMinutes);
		const hasUnexpectedScheduledAt = !scheduledAt.isSame(expected);
		if (hasUnexpectedScheduledAt) {
			throw new DomainValidationError('scheduledAt does not match occurrenceStart - offset');
		}
	}

	/**
	 * Возвращает новый объект reminder с пересчитанным `scheduledAt`.
	 */
	recalculateFor(eventStart: DateTime): EventReminder {
		const scheduledBase = this._nextOccurrenceStart ?? eventStart;
		const scheduled = scheduledBase.addMinutes(-this.offsetMinutes);

		return new EventReminder({
			id: this.id,
			eventId: this.eventId,
			offsetMinutes: this.offsetMinutes,
			nextOccurrenceStart: this._nextOccurrenceStart,
			scheduledAt: scheduled,
			sentAt: this._sentAt,
			createdAt: this.createdAt,
			updatedAt: DateTime.now(),
		});
	}

	/**
	 * Помечает reminder как отправленный.
	 */
	markSent(now: DateTime = DateTime.now()): void {
		this._sentAt = now;
	}
}
