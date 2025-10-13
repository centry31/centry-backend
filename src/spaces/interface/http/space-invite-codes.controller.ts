import { Body, Controller, Delete, Get, Param, Post, Request, UseFilters } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';

import { CreateSpaceInviteCodeUseCase } from '@spaces/application/use-cases/space-invite-code/create-space-invite-code.use-case';
import { AcceptSpaceInviteCodeUseCase } from '@spaces/application/use-cases/space-invite-code/accept-space-invite-code.use-case';
import { GetInfoSpaceInviteCodeUseCase } from '@spaces/application/use-cases/space-invite-code/get-info-space-invite-code.use-case';
import { GetActiveSpaceInviteCodesUseCase } from '@spaces/application/use-cases/space-invite-code/get-active-space-invite-codes.use-case';
import { DeleteSpaceInviteCodeUseCase } from '@spaces/application/use-cases/space-invite-code/delete-space-invite-code.use-case';

import { SpaceInviteCodesExceptionFilter } from './filter/space-invite-codes-exception.filter';

import { CreateSpaceInviteCodeDto } from './dto/space-invite-code/create-space-invite-code.dto';
import { AcceptSpaceInviteCodeDto } from './dto/space-invite-code/accept-space-invite-code.dto';
import { SpaceInviteCodeResponseDto } from './dto/space-invite-code/space-invite-code-response.dto';
import { GetInfoSpaceInviteCodeDto } from './dto/space-invite-code/get-info-space-invite-code.dto';
import { SpaceResponseDto } from './dto/space/space-response.dto';

// TODO: добавить гварды!!!
@UseFilters(SpaceInviteCodesExceptionFilter)
@Controller('space-invite-codes')
export class SpaceInviteCodesController {
	constructor(
		private readonly acceptSpaceInviteCodeUseCase: AcceptSpaceInviteCodeUseCase,
		private readonly createSpaceInviteCodeUseCase: CreateSpaceInviteCodeUseCase,
		private readonly getInfoSpaceInviteCodeUseCase: GetInfoSpaceInviteCodeUseCase,
		private readonly getActiveSpaceInviteCodesUseCase: GetActiveSpaceInviteCodesUseCase,
		private readonly deleteSpaceInviteCodeUseCase: DeleteSpaceInviteCodeUseCase,
	) {}

	@Post('accept')
	async accept(
		@Body('code') acceptSpaceInviteCodeDto: AcceptSpaceInviteCodeDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { user } = req;
		await this.acceptSpaceInviteCodeUseCase.execute({
			code: acceptSpaceInviteCodeDto.code,
			userId: user.id,
		});
		return formatResponse(null, 'Приглашение успешно принято');
	}

	@Post('create')
	async create(
		@Body() createSpaceInviteCodeDto: CreateSpaceInviteCodeDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { user, currentSpaceId } = req;
		const code = await this.createSpaceInviteCodeUseCase.execute({
			spaceId: currentSpaceId,
			createdByUserId: user.id,
			expiresAt: createSpaceInviteCodeDto.expiresAt,
			maxUses: createSpaceInviteCodeDto.maxUses,
		});
		const responseDto = plainToInstance(SpaceInviteCodeResponseDto, code, {
			excludeExtraneousValues: true,
		});
		return formatResponse(responseDto, 'Код создан');
	}

	@Post('info')
	async getInfo(@Body() getInfoSpaceInviteCodeDto: GetInfoSpaceInviteCodeDto) {
		const info = await this.getInfoSpaceInviteCodeUseCase.execute({
			code: getInfoSpaceInviteCodeDto.code,
		});
		const responseDto = plainToInstance(SpaceResponseDto, info, {
			excludeExtraneousValues: true,
		});
		return formatResponse(responseDto, 'Информация о пространстве по коду получена');
	}

	@Get(':spaceId')
	async getManyActive(@Param('spaceId') spaceId: string) {
		const codes = await this.getActiveSpaceInviteCodesUseCase.execute({ spaceId });
		const responseDto = codes.map((code) =>
			plainToInstance(SpaceInviteCodeResponseDto, code, { excludeExtraneousValues: true }),
		);
		return formatResponse(responseDto, 'Активные коды успешно получены');
	}

	@Delete(':spaceId/delete/:code')
	async delete(@Param('spaceId') spaceId: string, @Param('code') code: string) {
		await this.deleteSpaceInviteCodeUseCase.execute({ spaceId, code });
		return formatResponse(null, 'Код успешно удален');
	}
}
