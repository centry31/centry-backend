import * as crypto from 'crypto';

import { User } from '@users/domain/user.entity';
import { TgId } from '@users/domain/value-objests/tg-id.vo';

import { TOKEN_SERVICE, TokenService } from '@users/application/ports/jwt/token.service';
import { USER_REPOSITORY, UserRepository } from '@users/application/ports/user/user.repository';

import { Inject } from '@nestjs/common';

const BOT_TOKEN = process.env.BOT_TOKEN;

type Cmd = {
	id: string;
	auth_date: string;
	hash: string;

	first_name?: string;
	last_name?: string;
	username?: string;
	photo_url?: string;
};

export class TelegramAuthUseCase {
	constructor(
		@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
		@Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
	) {}

	private constantTimeEqual(a: string, b: string) {
		const bufA = Buffer.from(a, 'hex');
		const bufB = Buffer.from(b, 'hex');
		return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
	}

	/**
	 * Проверяет данные пользователя, которые приходят при логине через телеграм.
	 * */
	private validateTelegramPayload(cmd: Cmd) {
		const { hash, ...rest } = cmd;

		// 1) data_check_string
		const dataCheckString = Object.entries(rest)
			.map(([k, v]) => [k, String(v)])
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${k}=${v}`)
			.join('\n');

		// 2) secret_key = SHA256(bot_token)
		const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();

		// 3) hmac(data_check_string, secret_key)
		const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

		// TODO: вынести ошибки
		// 4) compare in constant time
		if (!this.constantTimeEqual(hmac, hash)) {
			// throw new HttpException('Неверный хэш телеграмма', HttpStatus.BAD_REQUEST);
			throw new Error('Неверный хэш телеграмма');
		}

		// 5) freshness (<= 24h)
		const authMs = Number(cmd.auth_date) * 1000;
		if (!Number.isFinite(authMs) || Date.now() - authMs > 24 * 60 * 60 * 1000) {
			// throw new HttpException('Дата истекла', HttpStatus.BAD_REQUEST);
			throw new Error('Дата истекла');
		}
	}

	async execute(cmd: Cmd): Promise<string> {
		this.validateTelegramPayload(cmd);

		const existUser = await this.userRepository.findByTgId(cmd.id);
		if (existUser) {
			const payload = { id: existUser.id };
			return this.tokenService.sign(payload);
		}

		const tgIdVo = TgId.fromBigInt(cmd.id);
		const user = new User({
			id: crypto.randomUUID(),
			tgId: tgIdVo,
			displayName: cmd.first_name,
			username: cmd.username,
		});
		await this.userRepository.create(user);

		const payload = { id: user.id };
		return this.tokenService.sign(payload);
	}
}
