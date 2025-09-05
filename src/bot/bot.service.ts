import { Body, Injectable } from '@nestjs/common';
import { CreateUserDto } from 'users/dto/create-user.dto';
import { UsersService } from 'users/users.service';
import { MagicLinksService } from 'magic-links/magic-links.service';

@Injectable()
export class BotService {
	constructor(
		private readonly usersService: UsersService,
		private readonly magicLinksService: MagicLinksService,
	) {}

	async registration(@Body() createUserDto: CreateUserDto) {
		const registeredUser = await this.usersService.registration(createUserDto);
		const magicLinkRawCode = await this.magicLinksService.createMagicLink({
			userId: registeredUser.id,
		});

		return magicLinkRawCode;
	}
}
