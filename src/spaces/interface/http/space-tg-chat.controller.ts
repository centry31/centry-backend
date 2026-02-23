import { GetSpaceTgChatsUseCase } from 'spaces/application/use-cases/space-tg-chat/get-space-tg-chats.use-case';

import { toSpaceTgChatResponse } from 'spaces/interface/http/dto/space-tg-chat/space-tg-chat.mapper';

import { SpaceMemberAccessGuard } from '../guard/space-member-access.guard';

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { formatResponse } from 'common/utils/response.util';
import { JwtAuthGuard } from 'users';

@UseGuards(JwtAuthGuard)
@Controller('space-tg-chats')
export class SpaceTgChatController {
	constructor(private readonly getSpaceTgChatsUseCase: GetSpaceTgChatsUseCase) {}

	@UseGuards(SpaceMemberAccessGuard)
	@Get(':spaceId')
	async get(@Param('spaceId') spaceId: string) {
		const chats = await this.getSpaceTgChatsUseCase.execute({ spaceId });
		const response = chats.map((chat) => toSpaceTgChatResponse(chat));
		return formatResponse(response, 'Чаты получены');
	}
}
