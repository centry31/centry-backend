import { SpaceNotFoundError } from '@spaces/domain/errors/space-not-found.error';

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpStatus } from '@nestjs/common';

@Catch(SpaceNotFoundError)
export class SpaceExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const res = ctx.getResponse();

		if (exception instanceof SpaceNotFoundError) {
			return res.status(HttpStatus.BAD_REQUEST).json({ message: exception.message });
		}

		throw exception;
	}
}
