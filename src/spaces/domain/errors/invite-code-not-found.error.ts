import { DomainNotFoundError } from 'common/domain/errors/domain.error';

export class InviteCodeNotFoundError extends DomainNotFoundError {
	constructor(message = 'Такой код не найден') {
		super(message);
		this.name = 'InviteCodeNotFoundError';
	}
}
