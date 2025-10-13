export class SpaceMemberLeaveError extends Error {
	constructor(message = 'Произошла ошибка при выходе из пространства') {
		super(message);
		this.name = 'SpaceMemberLeaveError';
	}
}
