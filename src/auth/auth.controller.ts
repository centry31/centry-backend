import {
	Body,
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Post,
	UseGuards,
	Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { formatResponse } from 'common/utils/response.util';
import { TelegramLoginDto } from 'auth/dto/telegram-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from './types/authenticated-request.interface';
import { plainToInstance } from 'class-transformer';
import { UserDto } from 'users/dto/user.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Get('init')
	@UseGuards(JwtAuthGuard)
	async init(@Request() req: AuthenticatedRequest) {
		const userId = req.user.id;

		const user = await this.authService.init(userId);
		const validatedUser = plainToInstance(UserDto, user, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedUser, 'Пользователь проинициализирован');
	}

	@Post('magic-link')
	async loginByMagicLink(@Body('code') code: string) {
		if (!code) {
			throw new HttpException(
				'Требуется указание кода для авторизации',
				HttpStatus.BAD_REQUEST,
			);
		}

		const jwtToken = await this.authService.loginByMagicLink(code);
		return formatResponse(jwtToken, 'Пользователь успешно аутентифицировался');
	}

	@Post('telegram')
	async loginWithTelegram(@Body() telegramLoginDto: TelegramLoginDto) {
		const jwtToken = await this.authService.loginWithTelegram(telegramLoginDto);
		return formatResponse(jwtToken, 'Авторизация через телеграм прошла успешно');
	}
}
