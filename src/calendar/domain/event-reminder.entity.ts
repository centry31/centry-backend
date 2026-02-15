import { DomainValidationError } from 'common/domain/errors/domain.error';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

type EventReminderProps = {
	id: string;
	eventId: string;
	offsetMinutes: number;
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

	private _scheduledAt?: DateTime;
	private _sentAt?: DateTime;

	constructor(props: EventReminderProps) {
		if (props.offsetMinutes < 0) {
			throw new DomainValidationError('offsetMinutes must be >= 0');
		}

		this.id = props.id;
		this.eventId = props.eventId;
		this.offsetMinutes = props.offsetMinutes;
		this._scheduledAt = props.scheduledAt;
		this._sentAt = props.sentAt;
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
	}

	get scheduledAt(): DateTime | undefined {
		return this._scheduledAt;
	}

	get sentAt(): DateTime | undefined {
		return this._sentAt;
	}

	ensureCoherentWith(eventStart: DateTime): void {
		if (this._scheduledAt) {
			const expected = eventStart.addMinutes(-this.offsetMinutes);
			if (!this._scheduledAt.isSame(expected)) {
				throw new DomainValidationError('scheduledAt does not match eventStart - offset');
			}
		}
	}

	recalculateFor(eventStart: DateTime): EventReminder {
		const scheduled = eventStart.addMinutes(-this.offsetMinutes);

		return new EventReminder({
			id: this.id,
			eventId: this.eventId,
			offsetMinutes: this.offsetMinutes,
			scheduledAt: scheduled,
			sentAt: this._sentAt,
			createdAt: this.createdAt,
			updatedAt: DateTime.now(),
		});
	}

	markSent(now: DateTime = DateTime.now()): void {
		if (this._sentAt) {
			throw new DomainValidationError('Reminder already sent');
		}
		this._sentAt = now;
	}
}
