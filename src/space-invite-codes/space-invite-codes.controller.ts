import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import type { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { SpaceInviteCodesService } from './space-invite-codes.service';
import { plainToInstance } from 'class-transformer';
import { SpaceDto } from 'spaces/dto/space.dto';
import { formatResponse } from 'common/utils/response.util';
import { SpaceOwnerAccessGuard } from 'spaces/space-owner-access.guard';
import { CreateSpaceInviteCodeDto } from './dto/create-space-invite-code.dto';
import { SpaceInviteCodeDto } from 'space-invite-codes/dto/space-invite-code.dto';

@Controller('space-invite-codes')
@UseGuards(JwtAuthGuard)
export class SpaceInviteCodesController {
	constructor(private readonly spaceInvitesService: SpaceInviteCodesService) {}

	@Post('info')
	async getSpaceInfoFromInviteCode(@Body('code') code: string) {
		const space = await this.spaceInvitesService.getSpaceInfoFromInviteCode(code);
		const validatedSpace = plainToInstance(SpaceDto, space, { excludeExtraneousValues: true });
		return formatResponse(validatedSpace, 'Информация о пространстве успешно получена');
	}

	@Post('accept')
	async acceptSpaceInviteCode(@Body('code') code: string, @Request() req: AuthenticatedRequest) {
		const { user } = req;

		const result = await this.spaceInvitesService.acceptSpaceInviteCode(code, user.id);
		return formatResponse(result, 'Вы присоединились к пространству');
	}

	@Post('create')
	@UseGuards(SpaceOwnerAccessGuard)
	async createSpaceInviteCode(
		@Body() createSpaceInviteCodeDto: CreateSpaceInviteCodeDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { user } = req;

		const createdCode = await this.spaceInvitesService.createSpaceInviteCode(
			createSpaceInviteCodeDto,
			user.id,
		);
		return formatResponse(createdCode, 'Код в пространство успешно создан');
	}

	@Get(':spaceId')
	@UseGuards(SpaceOwnerAccessGuard)
	async getActiveSpaceInviteCodes(@Param('spaceId') spaceId: string) {
		const links = await this.spaceInvitesService.getActiveSpaceInviteCodes(spaceId);
		const validatedCodes = links.map((link) =>
			plainToInstance(SpaceInviteCodeDto, link, { excludeExtraneousValues: true }),
		);
		return formatResponse(validatedCodes, 'Коды-приглашения в пространство успешно получены');
	}

	@Delete(':spaceId/delete/:code')
	@UseGuards(SpaceOwnerAccessGuard)
	async deleteSpaceInviteCode(@Param('spaceId') spaceId: string, @Param('code') code: string) {
		const deletedCode = await this.spaceInvitesService.deleteSpaceInviteCode(spaceId, code);
		const validatedDeletedCode = plainToInstance(SpaceInviteCodeDto, deletedCode, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedDeletedCode, 'Код-приглашение успешно удален');
	}
}
