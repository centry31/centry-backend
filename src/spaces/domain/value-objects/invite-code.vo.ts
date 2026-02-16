import { DomainValidationError } from 'common/domain/errors/domain.error';

export class InviteCode {
	public readonly value: string;

	// TODO: закинуть валидацию когда-нибудь
	constructor(value: string) {
		const normalizedValue = value.trim();
		if (!normalizedValue) {
			throw new DomainValidationError('InviteCode cannot be empty');
		}
		this.value = normalizedValue;
	}
}
