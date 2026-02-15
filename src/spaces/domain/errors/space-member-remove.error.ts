import { DomainValidationError } from 'common/domain/errors/domain.error';

export class SpaceMemberRemoveError extends DomainValidationError {
	constructor(message = 'Ошибка удаления участника') {
		super(message);
		this.name = 'SpaceMemberRemoveError';
	}
}
