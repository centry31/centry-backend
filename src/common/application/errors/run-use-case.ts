import {
	DomainConflictError,
	DomainError,
	DomainForbiddenError,
	DomainNotFoundError,
	DomainValidationError,
} from 'common/domain/errors/domain.error';

import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	HttpException,
	NotFoundException,
} from '@nestjs/common';

type UseCaseHandler<T> = () => Promise<T>;

export const runUseCase = async <T>(handler: UseCaseHandler<T>): Promise<T> => {
	try {
		return await handler();
	} catch (error) {
		if (error instanceof HttpException) {
			throw error;
		}
		if (error instanceof DomainNotFoundError) {
			throw new NotFoundException(error.message);
		}
		if (error instanceof DomainConflictError) {
			throw new ConflictException(error.message);
		}
		if (error instanceof DomainForbiddenError) {
			throw new ForbiddenException(error.message);
		}
		if (error instanceof DomainValidationError) {
			throw new BadRequestException(error.message);
		}
		if (error instanceof DomainError) {
			throw new BadRequestException(error.message);
		}
		throw error;
	}
};
