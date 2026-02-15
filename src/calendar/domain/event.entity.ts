import type { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { EventReminder } from './event-reminder.entity';

type EventProps = {
	id: string;
	title: string;
	start: DateTime;
	end: DateTime;
	spaceId: string;
	createdById: string;
	createdAt: DateTime;
	description?: string;
	reminders?: EventReminder[]; // по умолчанию []
};

export class Event {
	public readonly id: string;
	public readonly spaceId: string;
	public readonly createdById: string;
	public readonly createdAt: DateTime;

	private _title: string;
	private _description?: string;
	private _start: DateTime;
	private _end: DateTime;
	private _reminders: EventReminder[];

	constructor(props: EventProps) {
		this.id = props.id;
		this.spaceId = props.spaceId;
		this.createdById = props.createdById;
		this.createdAt = props.createdAt;

		this._title = this.normalizeTitle(props.title);
		this._description = props.description;
		this._start = props.start;
		this._end = props.end;
		this._reminders = props.reminders ? props.reminders.slice() : [];

		this.ensureStartBeforeEnd();
		this.ensureRemindersCoherent();
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

	get end(): DateTime {
		return this._end;
	}

	get reminders(): readonly EventReminder[] {
		return this._reminders;
	}

	private normalizeTitle(title: string): string {
		const normalizedTitle = title.trim();
		if (!normalizedTitle) {
			throw new Error('Title cannot be empty');
		}

		return normalizedTitle;
	}

	private ensureStartBeforeEnd(): void {
		if (!this._start.isBefore(this._end)) {
			throw new Error('Event.start must be strictly before Event.end');
		}
	}

	private ensureRemindersCoherent(): void {
		for (const r of this._reminders) {
			r.ensureCoherentWith(this._start);
		}
	}

	changeTitle(title: string): void {
		this._title = this.normalizeTitle(title);
	}

	changeDescription(desc?: string): void {
		this._description = desc;
	}

	changeStart(start: DateTime): void {
		if (!start.isBefore(this._end)) {
			throw new Error('start must be before end');
		}
		this._start = start;
		// пересчитать абсолютные напоминания, если используем scheduledAt = start - offset
		this._reminders = this._reminders.map((r) => r.recalculateFor(start));
	}

	changeEnd(end: DateTime): void {
		if (!this._start.isBefore(end)) {
			throw new Error('end must be after start');
		}
		this._end = end;
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
}
