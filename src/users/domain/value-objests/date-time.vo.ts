export class DateTime {
	public readonly value: Date;

	constructor(date: Date) {
		this.value = date;
	}

	static now(): DateTime {
		return new DateTime(new Date());
	}

	isBefore(other: DateTime): boolean {
		return this.value.getTime() < other.value.getTime();
	}
}
