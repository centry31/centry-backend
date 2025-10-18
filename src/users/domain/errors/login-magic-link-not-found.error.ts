export class LoginMagicLinkNotFoundError extends Error {
	constructor(message = 'Авторизационная ссылка не найдена') {
		super(message);
		this.name = 'LoginMagicLinkNotFoundError';
	}
}
