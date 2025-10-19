import type { EventReminder } from './event-reminder.entity';
import type { DateTime } from './value-objects/date-time.vo';

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

		this._title = props.title.trim();
		this._description = props.description;
		this._start = props.start;
		this._end = props.end;
		this._reminders = props.reminders ?? [];

		this.ensureStartBeforeEnd();
		this.ensureRemindersCoherent();
	}

	// === getters
	get title() {
		return this._title;
	}
	get description() {
		return this._description;
	}
	get start() {
		return this._start;
	}
	get end() {
		return this._end;
	}
	get reminders(): readonly EventReminder[] {
		return this._reminders;
	}

	// === invariants
	private ensureStartBeforeEnd() {
		if (!this._start.isBefore(this._end)) {
			throw new Error('Event.start must be strictly before Event.end');
		}
	}

	private ensureRemindersCoherent() {
		for (const r of this._reminders) {
			r.ensureCoherentWith(this._start);
		}
	}

	// === mutations
	changeTitle(title: string) {
		const t = title.trim();
		if (!t) throw new Error('Title cannot be empty');
		this._title = t;
	}

	changeDescription(desc?: string) {
		this._description = desc;
	}

	changeStart(start: DateTime) {
		if (!start.isBefore(this._end)) {
			throw new Error('start must be before end');
		}
		this._start = start;
		// пересчитать абсолютные напоминания, если используем scheduledAt = start - offset
		this._reminders = this._reminders.map((r) => r.recalculateFor(start));
	}

	changeEnd(end: DateTime) {
		if (!this._start.isBefore(end)) {
			throw new Error('end must be after start');
		}
		this._end = end;
	}

	addReminder(rem: EventReminder) {
		rem.ensureCoherentWith(this._start);
		this._reminders.push(rem);
	}

	replaceReminders(reminders: EventReminder[]) {
		for (const r of reminders) r.ensureCoherentWith(this._start);
		this._reminders = reminders.slice();
	}

	removeReminder(reminderId: string) {
		this._reminders = this._reminders.filter((r) => r.id !== reminderId);
	}

	clearReminders() {
		this._reminders = [];
	}
}
