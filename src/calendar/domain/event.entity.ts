import { DomainValidationError } from 'common/domain/errors/domain.error';
import type { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { EventReminder } from './event-reminder.entity';

export type EventFrequency = 'NEVER' | 'DAILY' | 'WEEKLY' | 'DOUBLE_WEEKLY' | 'MONTHLY';

type EventProps = {
	id: string;
	title: string;
	description?: string;

	start: DateTime;
	duration: number;

	spaceId: string;
	createdById: string;
	createdAt: DateTime;

	reminders?: EventReminder[]; // по умолчанию []

	frequency: EventFrequency;
};

export class Event {
	public readonly id: string;
	public readonly spaceId: string;
	public readonly createdById: string;
	public readonly createdAt: DateTime;

	private _title: string;
	private _description?: string;
	private _start: DateTime;
	private _duration: number;
	private _reminders: EventReminder[];
	private _frequency: EventFrequency = 'NEVER';

	constructor(props: EventProps) {
		this.id = props.id;
		this.spaceId = props.spaceId;
		this.createdById = props.createdById;
		this.createdAt = props.createdAt;

		this._title = this.normalizeTitle(props.title);
		this._description = props.description;
		this._start = props.start;
		this._duration = props.duration;

		this._reminders = props.reminders ? props.reminders.slice() : [];
		this._frequency = props.frequency;

		this.ensureRemindersCoherent();
		this.ensureDurationValid(this._duration);
	}

	get title(): string {
		return this._title;
	}

	get description(): string | undefined {
		return this._description;
	}

	get start(): DateTime {
		return this._start;
	}

	get duration() {
		return this._duration;
	}

	get reminders(): readonly EventReminder[] {
		return this._reminders;
	}

	get frequency() {
		return this._frequency;
	}

	private normalizeTitle(title: string): string {
		const normalizedTitle = title.trim();
		if (!normalizedTitle) {
			throw new DomainValidationError('Title cannot be empty');
		}

		return normalizedTitle;
	}

	private ensureRemindersCoherent(): void {
		for (const r of this._reminders) {
			r.ensureCoherentWith(this._start);
		}
	}

	private ensureDurationValid(duration: number): void {
		if (!Number.isInteger(duration) || duration <= 0) {
			throw new DomainValidationError(
				'Duration must be a positive integer number of minutes',
			);
		}
	}

	changeTitle(title: string): void {
		this._title = this.normalizeTitle(title);
	}

	changeDescription(desc?: string): void {
		this._description = desc;
	}

	changeStart(start: DateTime): void {
		this._start = start;
		// пересчитать абсолютные напоминания, если используем scheduledAt = start - offset
		this._reminders = this._reminders.map((r) => r.recalculateFor(start));
	}

	changeTimeRange(start: DateTime, duration: number): void {
		this.ensureDurationValid(duration);
		this._start = start;
		this._duration = duration;
		this._reminders = this._reminders.map((r) => r.recalculateFor(start));
	}

	addReminder(rem: EventReminder): void {
		rem.ensureCoherentWith(this._start);
		this._reminders.push(rem);
	}

	replaceReminders(reminders: EventReminder[]): void {
		for (const r of reminders) r.ensureCoherentWith(this._start);
		this._reminders = reminders.slice();
	}

	removeReminder(reminderId: string): void {
		this._reminders = this._reminders.filter((r) => r.id !== reminderId);
	}

	clearReminders(): void {
		this._reminders = [];
	}

	changeFrequency(frequency: EventFrequency): void {
		this._frequency = frequency;
	}
}
