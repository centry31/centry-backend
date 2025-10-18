export class LoginMagicLinkInvalidError extends Error {
	constructor(message = 'Некорректный формат кода') {
		super(message);
		this.name = 'LoginMagicLinkInvalidError';
	}
}
