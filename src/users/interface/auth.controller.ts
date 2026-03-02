import { InitAuthUseCase } from '@users/application/use-cases/auth/init-auth.use-case';
import { TelegramMiniAppAuthUseCase } from '@users/application/use-cases/auth/telegram-mini-app-auth.use-case';
import { TelegramOidcCreateNonceUseCase } from '@users/application/use-cases/auth/telegram-oidc-create-nonce.use-case';
import { TelegramOidcLoginAuthUseCase } from '@users/application/use-cases/auth/telegram-oidc-login-auth.use-case';

import { TelegramMiniAppAuthDto } from './dto/auth/telegram-mini-app-auth.dto';
import { TelegramOidcLoginAuthDto } from './dto/auth/telegram-oidc-login-auth.dto';
import { toUserResponse } from './dto/user/user-response.mapper';
import { JwtAuthGuard } from './guard/auth/jwt-auth.guard';

import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly telegramOidcCreateNonceUseCase: TelegramOidcCreateNonceUseCase,
		private readonly telegramOidcLoginAuthUseCase: TelegramOidcLoginAuthUseCase,
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

	@Post('telegram-oidc/nonce')
	async telegramOidcNonce() {
		const payload = await this.telegramOidcCreateNonceUseCase.execute();
		return formatResponse(payload, 'Nonce для Telegram OIDC создан');
	}

	@Post('telegram-oidc/login')
	async telegramOidcLogin(@Body() dto: TelegramOidcLoginAuthDto) {
		const token = await this.telegramOidcLoginAuthUseCase.execute({
			idToken: dto.id_token,
			nonceId: dto.nonceId,
		});
		return formatResponse(token, 'Авторизация через Telegram OIDC прошла успешно');
	}

	@Post('telegram-mini-app')
	async telegramMiniAppAuth(@Body() dto: TelegramMiniAppAuthDto) {
		const token = await this.telegramMiniAppAuthUseCase.execute(dto.initData);
		return formatResponse(token, 'Авторизация через Telegram Mini App прошла успешно');
	}
}
