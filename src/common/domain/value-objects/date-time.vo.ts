export class DateTime {
	private readonly _value: Date;

	constructor(value: Date) {
		if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
			throw new Error('Invalid DateTime');
		}

		this._value = new Date(value.getTime());
		Object.freeze(this);
	}

	static now(): DateTime {
		return new DateTime(new Date());
	}

	static fromDate(value: Date): DateTime {
		return new DateTime(value);
	}

	static fromMillis(value: number): DateTime {
		return new DateTime(new Date(value));
	}

	static fromISO(value: string): DateTime {
		return new DateTime(new Date(value));
	}

	get value(): Date {
		return new Date(this._value.getTime());
	}

	toDate(): Date {
		return this.value;
	}

	toMillis(): number {
		return this._value.getTime();
	}

	toISO(): string {
		return this._value.toISOString();
	}

	isBefore(other: DateTime): boolean {
		return this.toMillis() < other.toMillis();
	}

	isAfter(other: DateTime): boolean {
		return this.toMillis() > other.toMillis();
	}

	isSame(other: DateTime): boolean {
		return this.toMillis() === other.toMillis();
	}

	compare(other: DateTime): number {
		const diff = this.toMillis() - other.toMillis();
		if (diff === 0) {
			return 0;
		}

		return diff > 0 ? 1 : -1;
	}

	isSameOrBefore(other: DateTime): boolean {
		return this.compare(other) <= 0;
	}

	isSameOrAfter(other: DateTime): boolean {
		return this.compare(other) >= 0;
	}

	addMinutes(value: number): DateTime {
		return DateTime.fromMillis(this.toMillis() + value * 60_000);
	}

	addHours(value: number): DateTime {
		return DateTime.fromMillis(this.toMillis() + value * 3_600_000);
	}

	addDays(value: number): DateTime {
		return DateTime.fromMillis(this.toMillis() + value * 86_400_000);
	}

	diffMinutes(other: DateTime): number {
		return Math.round((this.toMillis() - other.toMillis()) / 60_000);
	}
}
