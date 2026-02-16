import { DomainValidationError } from 'common/domain/errors/domain.error';

export class SpaceMemberLeaveError extends DomainValidationError {
	constructor(message = 'Произошла ошибка при выходе из пространства') {
		super(message);
		this.name = 'SpaceMemberLeaveError';
	}
}
