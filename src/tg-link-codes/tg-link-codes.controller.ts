import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { CreateLinkCodeDto } from './dto/create-link-code.dto';
import { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';
import { TgLinkCodesService } from './tg-link-codes.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { SpaceAccessGuard } from 'spaces/space-access.guard';

@Controller('tg-link-codes')
@UseGuards(JwtAuthGuard, SpaceAccessGuard)
export class TgLinkCodesController {
	constructor(private readonly tgLinkCodesService: TgLinkCodesService) {}

	@Post('create')
	async createTgChatLinkCode(
		@Body() createLinkCodeDto: CreateLinkCodeDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { user } = req;
		// TODO: use spaceId from req? (require set currentSpaceId on space details page)
		const { spaceId } = createLinkCodeDto;

		const linkCode = await this.tgLinkCodesService.createLinkCodeForTgChat({
			spaceId,
			createdByUserId: user.id,
		});

		return formatResponse(linkCode, 'Код для привязки группы и пространства успешно создан');
	}
}
