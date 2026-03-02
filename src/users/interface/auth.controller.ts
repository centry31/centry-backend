import { InitAuthUseCase } from '@users/application/use-cases/auth/init-auth.use-case';
import { TelegramMiniAppAuthUseCase } from '@users/application/use-cases/auth/telegram-mini-app-auth.use-case';
import { TelegramWidgetAuthUseCase } from 'users/application/use-cases/auth/telegram-widget-auth-use.case';

import { TelegramMiniAppAuthDto } from './dto/auth/telegram-mini-app-auth.dto';
import { TelegramWidgetAuthDto } from './dto/auth/telegram-widget-auth.dto';
import { toUserResponse } from './dto/user/user-response.mapper';
import { JwtAuthGuard } from './guard/auth/jwt-auth.guard';

import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly telegramWidgetAuthUseCase: TelegramWidgetAuthUseCase,
		private readonly telegramMiniAppAuthUseCase: TelegramMiniAppAuthUseCase,
		private readonly initAuthUseCase: InitAuthUseCase,
	) {}

	@UseGuards(JwtAuthGuard)
	@Get('init')
	async init(@Request() req: AuthenticatedRequest) {
		const user = await this.initAuthUseCase.execute({ userId: req.user.id });
		const response = toUserResponse(user);
		return formatResponse(response, 'Пользователь проинициализирован');
	}

	@Post('telegram-widget')
	async telegramWidgetAuth(@Body() telegramWidgetAuthDto: TelegramWidgetAuthDto) {
		const token = await this.telegramWidgetAuthUseCase.execute(telegramWidgetAuthDto);
		return formatResponse(token, 'Авторизация через Telegram Widget прошла успешно');
	}

	@Post('telegram-mini-app')
	async telegramMiniAppAuth(@Body() dto: TelegramMiniAppAuthDto) {
		const token = await this.telegramMiniAppAuthUseCase.execute(dto.initData);
		return formatResponse(token, 'Авторизация через Telegram Mini App прошла успешно');
	}
}
