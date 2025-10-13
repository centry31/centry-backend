export class InviteCodeNotFoundError extends Error {
	constructor(message = 'Такой код не найден') {
		super(message);
		this.name = 'InviteCodeNotFoundError';
	}
}
