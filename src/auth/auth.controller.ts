import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { formatResponse } from 'common/utils/response.util';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

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
}
