export class UserNotFoundError extends Error {
	constructor(message = 'Пользователь не найден') {
		super(message);
		this.name = 'UserNotFoundError';
	}
}
