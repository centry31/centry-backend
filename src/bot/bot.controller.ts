import { Body, Controller, Post } from '@nestjs/common';
import { BotService } from './bot.service';
import type { CreateUserDto } from 'users/dto/create-user.dto';
import { formatResponse } from 'common/utils/response.util';
import { plainToInstance } from 'class-transformer';
import { LinkTgChatToSpaceDto } from 'space-tg-chats/dto/link-tg-chat-to-space.dto';
import { SpaceTgChatDto } from 'space-tg-chats/dto/space-tg-chat-dto';

// TODO: добавить guard для бота
@Controller('bot')
export class BotController {
	constructor(private readonly botService: BotService) {}

	@Post('registration')
	async registration(@Body() createUserDto: CreateUserDto) {
		const magicLinkRawCode = await this.botService.registration(createUserDto);
		return formatResponse(magicLinkRawCode, 'Уникальный код для регистрации сгенерирован');
	}

	@Post('link-tg-chat-to-space')
	async linkTgChatToSpace(@Body() linkTgChatToSpaceDto: LinkTgChatToSpaceDto) {
		const linkedChat = await this.botService.linkTgChatToSpace(linkTgChatToSpaceDto);
		const validatedLinkedChat = plainToInstance(SpaceTgChatDto, linkedChat, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedLinkedChat, 'Пространство успешно привязано к чату');
	}
}
