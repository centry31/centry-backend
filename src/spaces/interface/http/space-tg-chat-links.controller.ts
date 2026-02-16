import { CreateSpaceTgChatLinkCodeUseCase } from 'spaces/application/use-cases/space-tg-chat-link-code/create-space-tg-chat-link-code.use-case';
import { UseSpaceTgChatLinkCodeUseCase } from 'spaces/application/use-cases/space-tg-chat-link-code/use-space-tg-chat-link-code.use-case';

import { CreateSpaceTgChatLinkCodeDto } from './dto/space-tg-chat-link-code/create-space-tg-chat-link-code.dto';
import { UseSpaceTgChatLinkCodeDto } from './dto/space-tg-chat-link-code/use-space-tg-chat-link-code.dto';

import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';
import { JwtAuthGuard } from 'users';

// TODO: гварды
// TODO: фильтры
// TODO: тут к ручке use может идти кто угодно и нет никакой валидации
@Controller('space-tg-chat-links')
export class SpaceTgChatLinksController {
	constructor(
		private readonly createSpaceTgChatLinkCodeUseCase: CreateSpaceTgChatLinkCodeUseCase,
		private readonly useSpaceTgChatLinkCodeUseCase: UseSpaceTgChatLinkCodeUseCase,
	) {}

	@UseGuards(JwtAuthGuard)
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
