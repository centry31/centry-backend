import { InviteCodeInvalidError } from '@spaces/domain/errors/invite-code-invalid.error';
import { InviteCodeNotFoundError } from '@spaces/domain/errors/invite-code-not-found.error';

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpStatus } from '@nestjs/common';

@Catch(InviteCodeNotFoundError, InviteCodeInvalidError)
export class SpaceInviteCodesExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const res = ctx.getResponse();

		if (exception instanceof InviteCodeNotFoundError) {
			return res.status(HttpStatus.NOT_FOUND).json({ message: exception.message });
		}
		if (exception instanceof InviteCodeInvalidError) {
			return res.status(HttpStatus.NOT_FOUND).json({ message: exception.message });
		}
		throw exception;
	}
}
