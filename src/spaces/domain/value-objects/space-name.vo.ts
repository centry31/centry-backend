import { DomainValidationError } from 'common/domain/errors/domain.error';

export class SpaceName {
	public readonly value: string;

	constructor(value: string) {
		const normalizedValue = value.trim();
		if (!normalizedValue) {
			throw new DomainValidationError('Space name cannot be empty');
		}

		this.value = normalizedValue;
		Object.freeze(this);
	}
}
