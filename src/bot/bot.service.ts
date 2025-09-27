import { Body, Injectable } from '@nestjs/common';
import { CreateUserDto } from 'users/dto/create-user.dto';
import { UsersService } from 'users/users.service';
import { MagicLinksService } from 'magic-links/magic-links.service';
import { SpaceTgChatsService } from 'space-tg-chats/space-tg-chats.service';
import { LinkTgChatToSpaceDto } from 'space-tg-chats/dto/link-tg-chat-to-space.dto';

@Injectable()
export class BotService {
	constructor(
		private readonly usersService: UsersService,
		private readonly magicLinksService: MagicLinksService,
		private readonly spaceTgChatsService: SpaceTgChatsService,
	) {}

	async registration(@Body() createUserDto: CreateUserDto) {
		const registeredUser = await this.usersService.registration(createUserDto);
		const magicLinkRawCode = await this.magicLinksService.createMagicLink({
			userId: registeredUser.id,
		});

		return magicLinkRawCode;
	}

	async linkTgChatToSpace(linkTgChatToSpaceDto: LinkTgChatToSpaceDto) {
		const linkedChat = await this.spaceTgChatsService.linkTgChatToSpace(linkTgChatToSpaceDto);
		return linkedChat;
	}
}
