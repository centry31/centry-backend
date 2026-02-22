import { DomainValidationError } from 'common/domain/errors/domain.error';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

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

export class EventReminder {
	public readonly id: string;
	public readonly eventId: string;
	public readonly offsetMinutes: number;
	public readonly createdAt: DateTime;
	public readonly updatedAt: DateTime;

	private readonly _nextOccurrenceStart?: DateTime;
	private _scheduledAt?: DateTime;
	private _sentAt?: DateTime;

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

	get nextOccurrenceStart(): DateTime | undefined {
		return this._nextOccurrenceStart;
	}

	get scheduledAt(): DateTime | undefined {
		return this._scheduledAt;
	}

	get sentAt(): DateTime | undefined {
		return this._sentAt;
	}

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

	markSent(now: DateTime = DateTime.now()): void {
		this._sentAt = now;
	}
}
