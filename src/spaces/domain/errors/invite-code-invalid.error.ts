export class InviteCodeInvalidError extends Error {
	constructor(message = 'Код недействителен') {
		super(message);
		this.name = 'InviteCodeInvalidError';
	}
}
