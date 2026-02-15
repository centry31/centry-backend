import { DomainNotFoundError } from 'common/domain/errors/domain.error';

export class SpaceNotFoundError extends DomainNotFoundError {
	constructor(message = 'Пространство не найдено') {
		super(message);
		this.name = 'SpaceNotFoundError';
	}
}
