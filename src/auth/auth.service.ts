import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MagicLinksService } from 'magic-links/magic-links.service';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { UsersService } from 'users/users.service';
import { CreateUserDto } from 'users/dto/create-user.dto';

import * as crypto from 'crypto';

@Injectable()
export class AuthService {
	constructor(
		private readonly magicLinksService: MagicLinksService,
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
	) {}

	private async generateToken(user: User) {
		const payload = { id: user.id };
		return this.jwtService.sign(payload);
	}

	/**
	 * Инициализирует пользователя по существующему токену
	 * */
	async init(userId: string) {
		return this.usersService.findUserById(userId);
	}

	/**
	 * Вход через ссылку, сгенерированную через бот в телеграмме
	 * */
	async loginByMagicLink(code: string) {
		const user = await this.magicLinksService.exchangeMagicLink(code);
		return this.generateToken(user);
	}

	private constantTimeEqual(a: string, b: string) {
		const bufA = Buffer.from(a, 'hex');
		const bufB = Buffer.from(b, 'hex');
		return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
	}

	/**
	 * Проверяет данные пользователя, которые приходят при логине через телеграм.
	 * */
	private validateTelegramPayload(data: TelegramLoginDto, botToken: string) {
		const { hash, ...rest } = data as any;

		// 1) data_check_string
		const dataCheckString = Object.entries(rest)
			.map(([k, v]) => [k, String(v)])
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${k}=${v}`)
			.join('\n');

		// 2) secret_key = SHA256(bot_token)
		const secretKey = crypto.createHash('sha256').update(botToken).digest();

		// 3) hmac(data_check_string, secret_key)
		const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

		// 4) compare in constant time
		if (!this.constantTimeEqual(hmac, hash)) {
			throw new HttpException('Неверный хэш телеграмма', HttpStatus.BAD_REQUEST);
		}

		// 5) freshness (<= 24h)
		const authMs = Number(data.auth_date) * 1000;
		if (!Number.isFinite(authMs) || Date.now() - authMs > 24 * 60 * 60 * 1000) {
			throw new HttpException('Дата истекла', HttpStatus.BAD_REQUEST);
		}
	}

	/**
	 * Авторизует пользователя через телеграм.
	 * Если у пользователя нет аккаунта, создает его.
	 *
	 * @todo: подумать над тем, чтобы развести логику по логину и регистрации?
	 * */
	async loginWithTelegram(telegramLoginDto: TelegramLoginDto) {
		this.validateTelegramPayload(telegramLoginDto, process.env.BOT_TOKEN);

		// tg id в БД у BigInt - приводим аккуратно
		const tgId = BigInt(telegramLoginDto.id);

		// находим/создаём пользователя
		const user = await this.usersService.findUserByTelegramId(tgId);

		if (user) {
			const token = await this.generateToken(user);
			return token;
		}

		const userData: CreateUserDto = {
			tgId,
			username: telegramLoginDto.username,
			displayName: telegramLoginDto.first_name,
		};

		const createdUser = await this.usersService.registration(userData);
		return this.generateToken(createdUser);
	}
}
