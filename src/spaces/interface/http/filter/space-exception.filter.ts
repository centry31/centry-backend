import { SpaceNotFoundError } from '@spaces/domain/errors/space-not-found.error';

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';

@Catch(SpaceNotFoundError)
export class SpaceExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		if (exception instanceof SpaceNotFoundError) {
			throw new HttpException(exception.message, HttpStatus.BAD_REQUEST);
		}
		throw exception;
	}
}
