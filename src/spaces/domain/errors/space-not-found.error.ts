export class SpaceNotFoundError extends Error {
	constructor(message = 'Пространство не найдено') {
		super(message);
		this.name = 'SpaceNotFoundError';
	}
}
