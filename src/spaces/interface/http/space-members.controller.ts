import { GetSpaceMembersUseCase } from '@spaces/application/use-cases/space-member/get-space-members.use-case';
import { LeaveSpaceUseCase } from '@spaces/application/use-cases/space-member/leave-space.use-case';

import { SpaceMemberResponseDto } from './dto/space-member/space-member-response.dto';
import { SpaceMembersExceptionFilter } from './filter/space-members-exception.filter';

import { Controller, Delete, Get, Param, Request, UseFilters } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';

@UseFilters(SpaceMembersExceptionFilter)
@Controller('space-members')
export class SpaceMembersController {
	constructor(
		private readonly leaveSpaceUseCase: LeaveSpaceUseCase,
		private readonly getSpaceMembersUseCase: GetSpaceMembersUseCase,
	) {}

	@Delete('leave/:spaceId')
	async leave(@Param('spaceId') spaceId: string, @Request() req: AuthenticatedRequest) {
		const { user } = req;
		await this.leaveSpaceUseCase.execute({ spaceId, userId: user.id });
	}

	@Get(':spaceId')
	async getList(@Param('spaceId') spaceId: string) {
		const members = await this.getSpaceMembersUseCase.execute({ spaceId });
		const responseDto = members.map((member) =>
			plainToInstance(SpaceMemberResponseDto, member, { excludeExtraneousValues: true }),
		);
		return formatResponse(responseDto, 'Участники получены');
	}
}
