import { DateTime } from './value-objects/date-time.vo';

type ReminderProps = {
	id: string;
	eventId: string;
	offsetMinutes: number; // >= 0
	scheduledAt?: DateTime; // если хотим хранить абсолютный момент, иначе вычисляем на лету
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

	constructor(props: ReminderProps) {
		if (props.offsetMinutes < 0) throw new Error('offsetMinutes must be >= 0');

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

	/** Проверка консистентности с началом события */
	ensureCoherentWith(eventStart: DateTime) {
		// если scheduledAt храним — оно должно совпадать с (start - offset)
		if (this._scheduledAt) {
			const expected = DateTime.fromMillis(
				eventStart.value.getTime() - this.offsetMinutes * 60_000,
			);
			if (this._scheduledAt.value.getTime() !== expected.value.getTime()) {
				// можно пересчитать вместо throw — зависит от политики
				throw new Error('scheduledAt does not match eventStart - offset');
			}
		}
	}

	/** Пересчёт scheduledAt при смещении start */
	recalculateFor(eventStart: DateTime): EventReminder {
		const scheduled = DateTime.fromMillis(
			eventStart.value.getTime() - this.offsetMinutes * 60_000,
		);
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

	markSent(now: DateTime = DateTime.now()) {
		if (this._sentAt) throw new Error('Reminder already sent');
		this._sentAt = now;
	}
}
