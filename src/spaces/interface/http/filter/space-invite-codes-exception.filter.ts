import { InviteCodeInvalidError } from '@spaces/domain/errors/invite-code-invalid.error';
import { InviteCodeNotFoundError } from '@spaces/domain/errors/invite-code-not-found.error';

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';

@Catch(InviteCodeNotFoundError, InviteCodeInvalidError)
export class SpaceInviteCodesExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		if (exception instanceof InviteCodeNotFoundError) {
			throw new HttpException(exception.message, HttpStatus.NOT_FOUND);
		}
		if (exception instanceof InviteCodeInvalidError) {
			throw new HttpException(exception.message, HttpStatus.BAD_REQUEST);
		}
		throw exception;
	}
}
