import { DomainNotFoundError } from 'common/domain/errors/domain.error';

export class LoginMagicLinkNotFoundError extends DomainNotFoundError {
	constructor(message = 'Авторизационная ссылка не найдена') {
		super(message);
		this.name = 'LoginMagicLinkNotFoundError';
	}
}
