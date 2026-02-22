import { DomainValidationError } from 'common/domain/errors/domain.error';
import type { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { EventReminder } from './event-reminder.entity';

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

	get title(): string {
		return this._title;
	}

	get description(): string | undefined {
		return this._description;
	}

	get start(): DateTime {
		return this._start;
	}

	get rrule(): string | undefined {
		return this._rrule;
	}

	get timeZone(): string {
		return this._timeZone;
	}

	get duration(): number {
		return this._duration;
	}

	get reminders(): readonly EventReminder[] {
		return this._reminders;
	}

	get detachedFromEventId(): string | undefined {
		return this._detachedFromEventId;
	}

	get detachedFromOccurrenceStart(): DateTime | undefined {
		return this._detachedFromOccurrenceStart;
	}

	isRecurring(): boolean {
		return Boolean(this._rrule);
	}

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

	changeTitle(title: string): void {
		this._title = this.normalizeTitle(title);
	}

	changeDescription(desc?: string): void {
		this._description = desc;
	}

	changeStart(start: DateTime): void {
		this._start = start;
		this._reminders = this._reminders.map((reminder) => reminder.recalculateFor(start));
	}

	changeRecurrence(rrule?: string): void {
		this._rrule = rrule;
	}

	changeTimeZone(timeZone: string): void {
		this._timeZone = this.normalizeTimeZone(timeZone);
	}

	changeTimeRange(start: DateTime, duration: number): void {
		this.ensureDurationValid(duration);
		this._start = start;
		this._duration = duration;
		this._reminders = this._reminders.map((reminder) => reminder.recalculateFor(start));
	}

	setDetachedLink(detachedFromEventId?: string, detachedFromOccurrenceStart?: DateTime): void {
		this._detachedFromEventId = detachedFromEventId;
		this._detachedFromOccurrenceStart = detachedFromOccurrenceStart;
		this.ensureDetachedLinkCoherent();
	}

	addReminder(reminder: EventReminder): void {
		reminder.ensureCoherentWith(this._start);
		this._reminders.push(reminder);
	}

	replaceReminders(reminders: EventReminder[]): void {
		for (const reminder of reminders) {
			reminder.ensureCoherentWith(this._start);
		}
		this._reminders = reminders.slice();
	}

	removeReminder(reminderId: string): void {
		this._reminders = this._reminders.filter((reminder) => reminder.id !== reminderId);
	}

	clearReminders(): void {
		this._reminders = [];
	}
}
