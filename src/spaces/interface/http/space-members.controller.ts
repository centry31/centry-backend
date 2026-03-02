import { DeleteSpaceMemberUseCase } from '@spaces/application/use-cases/space-member/delete-space-member.use-case';
import { GetSpaceMembersUseCase } from '@spaces/application/use-cases/space-member/get-space-members.use-case';
import { LeaveSpaceUseCase } from '@spaces/application/use-cases/space-member/leave-space.use-case';

import { toSpaceMemberResponse } from 'spaces/interface/http/dto/space-member/space-member-response.mapper';

import { SpaceMemberAccessGuard } from '../guard/space-member-access.guard';
import { SpaceOwnerAccessGuard } from '../guard/space-owner-access.guard';

import { Controller, Delete, Get, Param, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';
import { JwtAuthGuard } from 'users';

@UseGuards(JwtAuthGuard)
@Controller('space-members')
export class SpaceMembersController {
	constructor(
		private readonly leaveSpaceUseCase: LeaveSpaceUseCase,
		private readonly getSpaceMembersUseCase: GetSpaceMembersUseCase,
		private readonly deleteSpaceMemberUseCase: DeleteSpaceMemberUseCase,
	) {}

	@UseGuards(SpaceMemberAccessGuard)
	@Delete('leave/:spaceId')
	async leave(@Param('spaceId') spaceId: string, @Request() req: AuthenticatedRequest) {
		const { user } = req;
		await this.leaveSpaceUseCase.execute({ spaceId, userId: user.id });
		return formatResponse(null, 'Вы успешно покинули пространство');
	}

	@UseGuards(SpaceOwnerAccessGuard)
	@Delete('delete/:spaceId/:userId')
	async delete(@Param('spaceId') spaceId: string, @Param('userId') userId: string) {
		await this.deleteSpaceMemberUseCase.execute({ spaceId, userId });
		return formatResponse(null, 'Вы успешно удалили участника');
	}

	@Get(':spaceId')
	async getList(@Param('spaceId') spaceId: string) {
		const members = await this.getSpaceMembersUseCase.execute({ spaceId });
		const response = members.map((member) => toSpaceMemberResponse(member));
		return formatResponse(response, 'Участники получены');
	}
}
