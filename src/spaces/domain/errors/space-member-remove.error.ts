export class SpaceMemberRemoveError extends Error {
	constructor(message = 'Ошибка удаления участника') {
		super(message);
		this.name = 'SpaceMemberDeleteError';
	}
}
