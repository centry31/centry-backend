import { DomainValidationError } from 'common/domain/errors/domain.error';

export class InviteCodeInvalidError extends DomainValidationError {
	constructor(message = 'Код недействителен') {
		super(message);
		this.name = 'InviteCodeInvalidError';
	}
}
