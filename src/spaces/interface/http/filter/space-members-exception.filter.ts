import { SpaceMemberLeaveError } from '@spaces/domain/errors/space-member-leave.error';
import { SpaceMemberRemoveError } from '@spaces/domain/errors/space-member-remove.error';

import type { ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';

@Catch(SpaceMemberLeaveError, SpaceMemberRemoveError)
export class SpaceMembersExceptionFilter implements ExceptionFilter {
	catch(exception: unknown) {
		if (exception instanceof SpaceMemberLeaveError) {
			throw new HttpException(exception.message, HttpStatus.BAD_REQUEST);
		}
		if (exception instanceof SpaceMemberRemoveError) {
			throw new HttpException(exception.message, HttpStatus.BAD_REQUEST);
		}
		throw exception;
	}
}
