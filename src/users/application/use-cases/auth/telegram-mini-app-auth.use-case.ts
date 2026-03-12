import * as crypto from 'crypto';

import { User } from '@users/domain/user.entity';
import { TelegramId as TgId } from 'common/domain/value-objects/telegram-id.vo';

import { TOKEN_SERVICE, TokenService } from '@users/application/ports/jwt/token.service';
import { USER_REPOSITORY, UserRepository } from '@users/application/ports/user/user.repository';

import { ENV } from 'common/infrastructure/env';

import { BadRequestException, Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type TelegramMiniAppUser = {
	id: number;
	first_name?: string;
	username?: string;
};

export class TelegramMiniAppAuthUseCase {
	constructor(
		@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
		@Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
	) {}

	private constantTimeEqual(a: string, b: string) {
		if (!/^[\da-f]{64}$/i.test(a) || !/^[\da-f]{64}$/i.test(b)) {
			return false;
		}

		const bufA = Buffer.from(a, 'hex');
		const bufB = Buffer.from(b, 'hex');
		return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
	}

	private verifySignature(initData: string): URLSearchParams {
		const params = new URLSearchParams(initData);
		const hash = params.get('hash');
		if (!hash) {
			throw new BadRequestException('Отсутствует hash в initData');
		}

		params.delete('hash');
		const dataCheckString = Array.from(params.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${k}=${v}`)
			.join('\n');

		const secretKey = crypto
			.createHmac('sha256', 'WebAppData')
			.update(ENV.TG_BOT_TOKEN)
			.digest();
		const expectedHash = crypto
			.createHmac('sha256', secretKey)
			.update(dataCheckString)
			.digest('hex');

		if (!this.constantTimeEqual(expectedHash, hash)) {
			throw new BadRequestException('Неверный hash Mini App');
		}

		return params;
	}

	private extractUser(params: URLSearchParams): TelegramMiniAppUser {
		const userRaw = params.get('user');
		if (!userRaw) {
			throw new BadRequestException('Отсутствует user в initData');
		}

		try {
			const user = JSON.parse(userRaw) as TelegramMiniAppUser;
			if (!Number.isFinite(user.id)) {
				throw new BadRequestException('Некорректный user.id в initData');
			}
			return user;
		} catch {
			throw new BadRequestException('Некорректный user в initData');
		}
	}

	private validateFreshness(params: URLSearchParams) {
		const authDateRaw = params.get('auth_date');
		const authDateSeconds = Number(authDateRaw);
		if (!Number.isFinite(authDateSeconds)) {
			throw new BadRequestException('Некорректный auth_date в initData');
		}

		const authMs = authDateSeconds * 1000;
		if (Date.now() - authMs > 24 * 60 * 60 * 1000) {
			throw new BadRequestException('Дата истекла');
		}
	}

	async execute(initData: string): Promise<string> {
		return runUseCase(async () => {
			const params = this.verifySignature(initData);
			this.validateFreshness(params);

			const telegramUser = this.extractUser(params);
			const telegramId = String(telegramUser.id);
			const existUser = await this.userRepository.findByTgId(telegramId);

			if (existUser) return this.tokenService.sign({ id: existUser.id });

			const user = new User({
				id: crypto.randomUUID(),
				tgId: TgId.fromBigInt(telegramId),
				displayName: telegramUser.first_name,
				username: telegramUser.username,
				isOnboardingCompleted: false,
			});
			await this.userRepository.create(user);

			return this.tokenService.sign({ id: user.id });
		});
	}
}
