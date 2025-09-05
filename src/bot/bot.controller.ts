import { Body, Controller, Post } from '@nestjs/common';
import { BotService } from 'bot/bot.service';
import type { CreateUserDto } from 'users/dto/create-user.dto';
import { formatResponse } from 'common/utils/response.util';

// TODO: добавить guard для бота
@Controller('bot')
export class BotController {
	constructor(private readonly botService: BotService) {}

	@Post('registration')
	async registration(@Body() createUserDto: CreateUserDto) {
		const magicLinkRawCode = await this.botService.registration(createUserDto);
		return formatResponse(magicLinkRawCode, 'Уникальный код для регистрации сгенерирован');
	}
}
