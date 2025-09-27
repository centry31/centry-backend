import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { SpaceTgChatsService } from './space-tg-chats.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { SpaceOwnerAccessGuard } from 'spaces/space-owner-access.guard';
import { plainToInstance } from 'class-transformer';
import { SpaceTgChatDto } from 'space-tg-chats/dto/space-tg-chat-dto';
import { formatResponse } from 'common/utils/response.util';

@Controller('space-tg-chats')
@UseGuards(JwtAuthGuard, SpaceOwnerAccessGuard)
export class SpaceTgChatsController {
	constructor(private readonly spaceTgChatsService: SpaceTgChatsService) {}

	@Get(':spaceId')
	async getSpaceTgChats(@Param('spaceId') spaceId: string) {
		const spaceTgChats = await this.spaceTgChatsService.getSpaceTgChats(spaceId);
		const validatedSpaceTgChats = spaceTgChats.map((chat) =>
			plainToInstance(SpaceTgChatDto, chat, { excludeExtraneousValues: true }),
		);
		return formatResponse(validatedSpaceTgChats, 'Чаты пространства успешно получены');
	}

	@Delete('/:spaceId/remove/:chatId')
	async removeTgChatFromSpace(
		@Param('spaceId') spaceId: string,
		@Param('chatId') chatId: string,
	) {
		const removedChat = await this.spaceTgChatsService.removeTgChatFromSpace(spaceId, chatId);
		const validatedRemovedChat = plainToInstance(SpaceTgChatDto, removedChat, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedRemovedChat, 'Чат успешно отвязан от пространства');
	}
}
