import { AcceptSpaceInviteCodeUseCase } from '@spaces/application/use-cases/space-invite-code/accept-space-invite-code.use-case';
import { CreateSpaceInviteCodeUseCase } from '@spaces/application/use-cases/space-invite-code/create-space-invite-code.use-case';
import { DeleteSpaceInviteCodeUseCase } from '@spaces/application/use-cases/space-invite-code/delete-space-invite-code.use-case';
import { GetInfoSpaceInviteCodeUseCase } from '@spaces/application/use-cases/space-invite-code/get-info-space-invite-code.use-case';
import { GetSpaceInviteCodesUseCase } from 'spaces/application/use-cases/space-invite-code/get-space-invite-codes.use-case';

import { SpaceOwnerAccessGuard } from '../guard/space-owner-access.guard';
import { toSpaceResponse } from './dto/space/space-response.mapper';
import { AcceptSpaceInviteCodeDto } from './dto/space-invite-code/accept-space-invite-code.dto';
import { GetInfoSpaceInviteCodeDto } from './dto/space-invite-code/get-info-space-invite-code.dto';
import { toSpaceInviteCodeResponse } from './dto/space-invite-code/space-invite-code-response.mapper';

import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';
import { JwtAuthGuard } from 'users';

@UseGuards(JwtAuthGuard)
@Controller('space-invite-codes')
export class SpaceInviteCodesController {
	constructor(
		private readonly acceptSpaceInviteCodeUseCase: AcceptSpaceInviteCodeUseCase,
		private readonly createSpaceInviteCodeUseCase: CreateSpaceInviteCodeUseCase,
		private readonly getInfoSpaceInviteCodeUseCase: GetInfoSpaceInviteCodeUseCase,
		private readonly getSpaceInviteCodesUseCase: GetSpaceInviteCodesUseCase,
		private readonly deleteSpaceInviteCodeUseCase: DeleteSpaceInviteCodeUseCase,
	) {}

	@Post('accept')
	async accept(
		@Body() acceptSpaceInviteCodeDto: AcceptSpaceInviteCodeDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { user } = req;
		await this.acceptSpaceInviteCodeUseCase.execute({
			code: acceptSpaceInviteCodeDto.code,
			userId: user.id,
		});
		return formatResponse(null, 'Приглашение успешно принято');
	}

	@UseGuards(SpaceOwnerAccessGuard)
	@Post(':spaceId/create')
	async create(@Request() req: AuthenticatedRequest, @Param('spaceId') spaceId: string) {
		const { user } = req;
		const code = await this.createSpaceInviteCodeUseCase.execute({
			spaceId,
			createdByUserId: user.id,
		});
		const response = toSpaceInviteCodeResponse(code);
		return formatResponse(response, 'Код создан');
	}

	@Post('info')
	async getInfo(@Body() getInfoSpaceInviteCodeDto: GetInfoSpaceInviteCodeDto) {
		const info = await this.getInfoSpaceInviteCodeUseCase.execute({
			code: getInfoSpaceInviteCodeDto.code,
		});
		const response = toSpaceResponse(info);
		return formatResponse(response, 'Информация о пространстве по коду получена');
	}

	@UseGuards(SpaceOwnerAccessGuard)
	@Get(':spaceId')
	async getAll(@Param('spaceId') spaceId: string) {
		const codes = await this.getSpaceInviteCodesUseCase.execute({ spaceId });
		const response = codes.map((code) => toSpaceInviteCodeResponse(code));
		return formatResponse(response, 'Активные коды успешно получены');
	}

	@UseGuards(SpaceOwnerAccessGuard)
	@Delete(':spaceId/delete/:code')
	async delete(@Param('spaceId') spaceId: string, @Param('code') code: string) {
		await this.deleteSpaceInviteCodeUseCase.execute({ spaceId, code });
		return formatResponse(null, 'Код успешно удален');
	}
}
