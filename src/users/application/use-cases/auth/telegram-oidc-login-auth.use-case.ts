import * as crypto from 'crypto';

import { TelegramOidcNonceStore } from '@users/application/use-cases/auth/telegram-oidc-nonce.store';

import { User } from '@users/domain/user.entity';
import { TelegramId as TgId } from 'common/domain/value-objects/telegram-id.vo';

import { TOKEN_SERVICE, TokenService } from '@users/application/ports/jwt/token.service';
import { USER_REPOSITORY, UserRepository } from '@users/application/ports/user/user.repository';

import { ENV } from 'common/infrastructure/env';

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { runUseCase } from 'common/application/errors/run-use-case';

const TELEGRAM_OIDC_ISSUER = 'https://oauth.telegram.org';
const TELEGRAM_OIDC_JWKS_URI = 'https://oauth.telegram.org/.well-known/jwks.json';
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

type Cmd = {
	idToken: string;
	nonceId: string;
};

type Jwk = {
	kid: string;
	kty: string;
	alg?: string;
	n?: string;
	e?: string;
	use?: string;
};

type JwtHeader = {
	alg?: string;
	kid?: string;
	typ?: string;
};

type JwtPayload = {
	iss?: string;
	sub?: string;
	aud?: string | string[];
	exp?: number;
	iat?: number;
	nonce?: string;
	id?: string | number;
	first_name?: string;
	last_name?: string;
	username?: string;
	name?: string;
	given_name?: string;
	family_name?: string;
	preferred_username?: string;
};

type ParsedJwt = {
	header: JwtHeader;
	payload: JwtPayload;
	signingInput: string;
	signature: Buffer;
};

@Injectable()
export class TelegramOidcLoginAuthUseCase {
	private jwksCache: { keys: Jwk[]; expiresAt: number } | null = null;

	constructor(
		@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
		@Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
		private readonly nonceStore: TelegramOidcNonceStore,
	) {}

	private parseJwt(token: string): ParsedJwt {
		const parts = token.split('.');
		if (parts.length !== 3) {
			throw new BadRequestException('Некорректный id_token от Telegram');
		}

		const [encodedHeader, encodedPayload, encodedSignature] = parts;

		try {
			const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf-8'));
			const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
			const signature = Buffer.from(encodedSignature, 'base64url');

			return {
				header,
				payload,
				signingInput: `${encodedHeader}.${encodedPayload}`,
				signature,
			};
		} catch {
			throw new BadRequestException('Некорректный id_token от Telegram');
		}
	}

	private async getJwks(): Promise<Jwk[]> {
		const now = Date.now();
		if (this.jwksCache && this.jwksCache.expiresAt > now) {
			return this.jwksCache.keys;
		}

		const response = await axios.get<{ keys?: Jwk[] }>(TELEGRAM_OIDC_JWKS_URI, {
			timeout: 10_000,
			validateStatus: () => true,
		});

		if (response.status >= 400 || !Array.isArray(response.data?.keys)) {
			throw new BadRequestException('Не удалось получить JWKS ключи Telegram OIDC');
		}

		this.jwksCache = {
			keys: response.data.keys,
			expiresAt: now + JWKS_CACHE_TTL_MS,
		};

		return response.data.keys;
	}

	private async verifySignature(parsed: ParsedJwt): Promise<void> {
		const { header, signingInput, signature } = parsed;
		if (header.alg !== 'RS256' || !header.kid) {
			throw new BadRequestException('Некорректный id_token от Telegram');
		}

		const keys = await this.getJwks();
		const jwk = keys.find((key) => key.kid === header.kid);
		if (!jwk) {
			throw new BadRequestException('Не найден ключ подписи Telegram OIDC');
		}

		const publicKey = crypto.createPublicKey({ key: jwk as any, format: 'jwk' });
		const isValid = crypto.verify(
			'RSA-SHA256',
			Buffer.from(signingInput, 'utf-8'),
			publicKey,
			signature,
		);

		if (!isValid) {
			throw new BadRequestException('Подпись id_token недействительна');
		}
	}

	private validateClaims(payload: JwtPayload, expectedNonce: string): void {
		if (payload.iss !== TELEGRAM_OIDC_ISSUER) {
			throw new BadRequestException('Некорректный issuer id_token');
		}

		const aud = payload.aud;
		const hasAudienceMatch = Array.isArray(aud)
			? aud.includes(ENV.TG_OIDC_CLIENT_ID)
			: aud === ENV.TG_OIDC_CLIENT_ID;
		if (!hasAudienceMatch) {
			throw new BadRequestException('Некорректный audience id_token');
		}

		const nowSeconds = Math.floor(Date.now() / 1000);
		if (!Number.isFinite(payload.exp) || (payload.exp as number) <= nowSeconds - 30) {
			throw new BadRequestException('Срок действия id_token истек');
		}

		if (Number.isFinite(payload.iat) && (payload.iat as number) > nowSeconds + 60) {
			throw new BadRequestException('Некорректное время выпуска id_token');
		}

		if (!payload.sub || typeof payload.sub !== 'string') {
			throw new BadRequestException('Отсутствует claim sub в id_token');
		}

		if (!payload.nonce || payload.nonce !== expectedNonce) {
			throw new BadRequestException('Некорректный nonce id_token');
		}
	}

	private extractTelegramId(payload: JwtPayload): string {
		const rawId = payload.id;
		if (typeof rawId === 'number') {
			if (!Number.isFinite(rawId) || rawId <= 0) {
				throw new BadRequestException('Некорректный claim id в id_token');
			}
			return Math.trunc(rawId).toString();
		}

		if (typeof rawId === 'string' && /^\d+$/.test(rawId.trim())) {
			return rawId.trim();
		}

		if (typeof payload.sub === 'string' && /^\d+$/.test(payload.sub)) {
			return payload.sub;
		}

		throw new BadRequestException('Не найден корректный Telegram user id в id_token');
	}

	private extractDisplayName(payload: JwtPayload): string | undefined {
		const firstName = payload.first_name?.trim();
		const lastName = payload.last_name?.trim();
		const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
		if (fullName) {
			return fullName;
		}

		const preferredName = payload.name?.trim() || payload.given_name?.trim();
		return preferredName || undefined;
	}

	private extractUsername(payload: JwtPayload): string | undefined {
		const username = payload.username?.trim() || payload.preferred_username?.trim();
		return username || undefined;
	}

	async execute(cmd: Cmd): Promise<string> {
		return runUseCase(async () => {
			const expectedNonce = this.nonceStore.consume(cmd.nonceId);
			if (!expectedNonce) {
				throw new BadRequestException('OIDC nonce истек или недействителен');
			}

			const parsed = this.parseJwt(cmd.idToken);
			await this.verifySignature(parsed);
			this.validateClaims(parsed.payload, expectedNonce);

			const tgId = this.extractTelegramId(parsed.payload);
			const existingUser = await this.userRepository.findByTgId(tgId);
			if (existingUser) {
				return this.tokenService.sign({ id: existingUser.id });
			}

			const user = new User({
				id: crypto.randomUUID(),
				tgId: TgId.fromBigInt(tgId),
				displayName: this.extractDisplayName(parsed.payload),
				username: this.extractUsername(parsed.payload),
				isOnboardingCompleted: false,
			});
			await this.userRepository.create(user);

			return this.tokenService.sign({ id: user.id });
		});
	}
}
