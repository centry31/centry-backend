import { InitAuthUseCase } from '@users/application/use-cases/auth/init-auth.use-case';
import { TelegramAuthUseCase } from '@users/application/use-cases/auth/telegram-auth.use-case';

import { TelegramAuthDto } from './dto/auth/telegram-auth.dto';
import { toUserResponse } from './dto/user/user-response.mapper';
import { JwtAuthGuard } from './guard/auth/jwt-auth.guard';

import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly telegramAuthUseCase: TelegramAuthUseCase,
		private readonly initAuthUseCase: InitAuthUseCase,
	) {}

	@UseGuards(JwtAuthGuard)
	@Get('init')
	async init(@Request() req: AuthenticatedRequest) {
		const user = await this.initAuthUseCase.execute({ userId: req.user.id });
		const response = toUserResponse(user);
		return formatResponse(response, 'Пользователь проинициализирован');
	}

	@Post('telegram')
	async telegramAuth(@Body() telegramLoginDto: TelegramAuthDto) {
		const token = await this.telegramAuthUseCase.execute(telegramLoginDto);
		return formatResponse(token, 'Авторизация через телеграм прошла успешно');
	}
}
