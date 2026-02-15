import { CreateSpaceTgChatLinkCodeUseCase } from 'spaces/application/use-cases/space-tg-chat-link-code/create-space-tg-chat-link-code.use-case';

import { CreateSpaceTgChatLinkCodeDto } from './dto/space-tg-chat-link-code/create-space-tg-chat-link-code.dto';

import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';
import { JwtAuthGuard } from 'users';

// TODO: гварды
// TODO: фильтры
@UseGuards(JwtAuthGuard)
@Controller('space-tg-chat-links')
export class SpaceTgChatLinksController {
	constructor(
		private readonly createSpaceTgChatLinkCodeUseCase: CreateSpaceTgChatLinkCodeUseCase,
	) {}

	@Post('create')
	async create(
		@Body() createSpaceTgChatLinkCodeDto: CreateSpaceTgChatLinkCodeDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { user } = req;
		const code = await this.createSpaceTgChatLinkCodeUseCase.execute({
			spaceId: createSpaceTgChatLinkCodeDto.spaceId,
			userId: user.id,
		});
		return formatResponse(code, 'Ссылка для привязки успешно создана');
	}
}
