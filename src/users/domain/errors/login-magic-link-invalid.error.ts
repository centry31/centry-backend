import { DomainValidationError } from 'common/domain/errors/domain.error';

export class LoginMagicLinkInvalidError extends DomainValidationError {
	constructor(message = 'Некорректный формат кода') {
		super(message);
		this.name = 'LoginMagicLinkInvalidError';
	}
}
