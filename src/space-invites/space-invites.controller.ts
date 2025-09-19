import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import type { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { SpaceInvitesService } from './space-invites.service';
import { plainToInstance } from 'class-transformer';
import { SpaceDto } from 'spaces/dto/space.dto';
import { formatResponse } from 'common/utils/response.util';
import { SpaceOwnerAccessGuard } from 'spaces/space-owner-access.guard';
import { CreateSpaceInviteDto } from './dto/create-space-invite.dto';

@Controller('space-invites')
@UseGuards(JwtAuthGuard)
export class SpaceInvitesController {
	constructor(private readonly spaceInvitesService: SpaceInvitesService) {}

	@Post('info')
	async getSpaceInfo(@Body('code') code: string) {
		const space = await this.spaceInvitesService.getSpaceInfoFromInviteLink(code);
		const validatedSpace = plainToInstance(SpaceDto, space, { excludeExtraneousValues: true });
		return formatResponse(validatedSpace, 'Информация о пространстве успешно получена');
	}

	@Post('accept')
	async acceptInviteLink(@Body('code') code: string, @Request() req: AuthenticatedRequest) {
		const { user } = req;
		const result = await this.spaceInvitesService.acceptInviteLink(code, user.id);
		return formatResponse(result, 'Вы присоединились к пространству');
	}

	@Post('create')
	@UseGuards(SpaceOwnerAccessGuard)
	async createInviteLink(
		@Body() createSpaceInviteDto: CreateSpaceInviteDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { user, currentSpaceId } = req;
		const createdLink = await this.spaceInvitesService.createInviteLink(
			createSpaceInviteDto,
			user.id,
			currentSpaceId,
		);
		return formatResponse(createdLink, 'Ссылка для приглашения в пространство успешно создана');
	}
}
