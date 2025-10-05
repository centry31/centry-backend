import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { CreateLinkCodeDto } from './dto/create-link-code.dto';
import { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';
import { SpaceLinkCodesService } from './space-link-codes.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { SpaceOwnerAccessGuard } from 'spaces/guards/space-owner-access.guard';

@Controller('tg-link-codes')
@UseGuards(JwtAuthGuard, SpaceOwnerAccessGuard)
export class SpaceLinkCodesController {
	constructor(private readonly tgLinkCodesService: SpaceLinkCodesService) {}

	@Post('create')
	async createTgChatLinkCode(
		@Body() createLinkCodeDto: CreateLinkCodeDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { user } = req;

		const linkCode = await this.tgLinkCodesService.createLinkCode(createLinkCodeDto, user.id);
		return formatResponse(linkCode, 'Код для привязки группы и пространства успешно создан');
	}
}
