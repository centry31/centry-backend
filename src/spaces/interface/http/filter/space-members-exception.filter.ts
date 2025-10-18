import { SpaceMemberLeaveError } from '@spaces/domain/errors/space-member-leave.error';
import { SpaceMemberRemoveError } from '@spaces/domain/errors/space-member-remove.error';

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpStatus } from '@nestjs/common';

@Catch(SpaceMemberLeaveError, SpaceMemberRemoveError)
export class SpaceMembersExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const res = ctx.getResponse();

		if (exception instanceof SpaceMemberLeaveError) {
			return res.status(HttpStatus.BAD_REQUEST).json({ message: exception.message });
		}
		if (exception instanceof SpaceMemberRemoveError) {
			return res.status(HttpStatus.BAD_REQUEST).json({ message: exception.message });
		}
		throw exception;
	}
}
