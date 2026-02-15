import { DomainValidationError } from 'common/domain/errors/domain.error';

export class HashCode {
	public readonly value: string;

	constructor(value: string) {
		const normalizedValue = value.trim();
		if (!normalizedValue) {
			throw new DomainValidationError('HashCode cannot be empty');
		}
		this.value = normalizedValue;
		Object.freeze(this);
	}
}
