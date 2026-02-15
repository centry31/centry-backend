export class DateTime {
	private constructor(private readonly _value: Date) {
		if (!(this._value instanceof Date) || Number.isNaN(this._value.getTime())) {
			throw new Error('Invalid DateTime');
		}
		Object.freeze(this);
	}

	// фабрики
	static now(): DateTime {
		return new DateTime(new Date());
	}
	static fromDate(d: Date): DateTime {
		return new DateTime(new Date(d.getTime())); // клон
	}
	static fromMillis(ms: number): DateTime {
		return new DateTime(new Date(ms));
	}
	static fromISO(iso: string): DateTime {
		return new DateTime(new Date(iso));
	}

	// представления
	get value(): Date {
		// всегда отдаём клон, чтобы сохранить иммутабельность VO
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

	// сравнения
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
		const d = this.toMillis() - other.toMillis();
		return d === 0 ? 0 : d > 0 ? 1 : -1;
	}
	isSameOrBefore(other: DateTime): boolean {
		return this.compare(other) <= 0;
	}
	isSameOrAfter(other: DateTime): boolean {
		return this.compare(other) >= 0;
	}

	// арифметика
	addMinutes(n: number): DateTime {
		return DateTime.fromMillis(this.toMillis() + n * 60_000);
	}
	addHours(n: number): DateTime {
		return DateTime.fromMillis(this.toMillis() + n * 3_600_000);
	}
	addDays(n: number): DateTime {
		return DateTime.fromMillis(this.toMillis() + n * 86_400_000);
	}
	diffMinutes(other: DateTime): number {
		return Math.round((this.toMillis() - other.toMillis()) / 60_000);
	}
}
