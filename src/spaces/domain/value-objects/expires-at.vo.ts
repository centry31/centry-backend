import { DomainValidationError } from 'common/domain/errors/domain.error';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

export class ExpiresAt {
	private readonly _value: DateTime;

	constructor(date: Date) {
		const dateTime = DateTime.fromDate(date);
		if (dateTime.isSameOrBefore(DateTime.now())) {
			throw new DomainValidationError('Invite code expiry must be in the future');
		}

		this._value = dateTime;
		Object.freeze(this);
	}

	get value(): Date {
		return this._value.value;
	}

	get dateTime(): DateTime {
		return this._value;
	}

	isExpired(now: DateTime = DateTime.now()): boolean {
		return now.isSameOrAfter(this._value);
	}
}
