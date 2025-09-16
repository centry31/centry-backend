import { Body, Injectable } from '@nestjs/common';
import { CreateUserDto } from 'users/dto/create-user.dto';
import { UsersService } from 'users/users.service';
import { MagicLinksService } from 'magic-links/magic-links.service';
import { TgLinkCodesService } from 'tg-link-codes/tg-link-codes.service';
import { LinkTgChatToSpaceDto } from 'tg-link-codes/dto/link-tg-chat-to-space.dto';

@Injectable()
export class BotService {
	constructor(
		private readonly usersService: UsersService,
		private readonly magicLinksService: MagicLinksService,
		private readonly tgLinkCodesService: TgLinkCodesService,
	) {}

	async registration(@Body() createUserDto: CreateUserDto) {
		const registeredUser = await this.usersService.registration(createUserDto);
		const magicLinkRawCode = await this.magicLinksService.createMagicLink({
			userId: registeredUser.id,
		});

		return magicLinkRawCode;
	}

	async linkTgChatToSpace(linkTgChatToSpaceDto: LinkTgChatToSpaceDto) {
		const linkedChat = await this.tgLinkCodesService.linkTgChatToSpace(linkTgChatToSpaceDto);
		return linkedChat;
	}
}
