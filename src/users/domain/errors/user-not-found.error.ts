import { DomainNotFoundError } from 'common/domain/errors/domain.error';

export class UserNotFoundError extends DomainNotFoundError {
	constructor(message = 'Пользователь не найден') {
		super(message);
		this.name = 'UserNotFoundError';
	}
}
