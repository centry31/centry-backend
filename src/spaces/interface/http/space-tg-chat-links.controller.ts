import { CreateSpaceTgChatLinkCodeUseCase } from 'spaces/application/use-cases/space-tg-chat-link-code/create-space-tg-chat-link-code.use-case';
import { UseSpaceTgChatLinkCodeUseCase } from 'spaces/application/use-cases/space-tg-chat-link-code/use-space-tg-chat-link-code.use-case';

import { SpaceOwnerAccessGuard } from '../guard/space-owner-access.guard';
import { UseSpaceTgChatLinkCodeDto } from './dto/space-tg-chat-link-code/use-space-tg-chat-link-code.dto';

import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';
import { JwtAuthGuard } from 'users';

@Controller('space-tg-chat-links')
export class SpaceTgChatLinksController {
	constructor(
		private readonly createSpaceTgChatLinkCodeUseCase: CreateSpaceTgChatLinkCodeUseCase,
		private readonly useSpaceTgChatLinkCodeUseCase: UseSpaceTgChatLinkCodeUseCase,
	) {}

	@UseGuards(JwtAuthGuard, SpaceOwnerAccessGuard)
	@Post(':spaceId/create')
	async create(@Request() req: AuthenticatedRequest, @Param('spaceId') spaceId: string) {
		const { user } = req;
		const code = await this.createSpaceTgChatLinkCodeUseCase.execute({
			spaceId,
			userId: user.id,
		});
		return formatResponse(code, 'Ссылка для привязки успешно создана');
	}

	// TODO: тут к ручке use может идти кто угодно и нет никакой валидации
	// нужна валидация для бота
	@Post('use')
	async use(@Body() useSpaceTgChatLinkCodeDto: UseSpaceTgChatLinkCodeDto) {
		await this.useSpaceTgChatLinkCodeUseCase.execute({
			code: useSpaceTgChatLinkCodeDto.hashCode,
			chatId: useSpaceTgChatLinkCodeDto.chatTgId,
			chatType: useSpaceTgChatLinkCodeDto.chatType,
			title: useSpaceTgChatLinkCodeDto.chatTitle,
			initiatedByTgId: useSpaceTgChatLinkCodeDto.initiatedByTgId,
			messageThreadId: useSpaceTgChatLinkCodeDto.messageThreadId,
		});
		return formatResponse(null, 'Чат успешно привязан к пространству');
	}
}
