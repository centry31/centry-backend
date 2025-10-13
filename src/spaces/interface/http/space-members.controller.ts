import { Controller, Delete, Get, Param, Request } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';

import { LeaveSpaceUseCase } from '@spaces/application/use-cases/space-member/leave-space.use-case';
import { GetSpaceMembersUseCase } from '@spaces/application/use-cases/space-member/get-space-members.use-case';

import { SpaceMemberResponseDto } from './dto/space-member/space-member-response.dto';

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
