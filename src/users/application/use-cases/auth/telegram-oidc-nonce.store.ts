import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';

type NonceSession = {
	nonce: string;
	expiresAt: number;
};

const TTL_MS = 10 * 60 * 1000;
const MAX_SESSIONS = 10_000;

@Injectable()
export class TelegramOidcNonceStore {
	private readonly sessions = new Map<string, NonceSession>();

	create(): { nonceId: string; nonce: string; expiresInSeconds: number } {
		this.pruneExpired();

		if (this.sessions.size >= MAX_SESSIONS) {
			const oldestKey = this.sessions.keys().next().value;
			if (oldestKey) {
				this.sessions.delete(oldestKey);
			}
		}

		const nonceId = crypto.randomUUID();
		const nonce = crypto.randomBytes(24).toString('base64url');
		this.sessions.set(nonceId, {
			nonce,
			expiresAt: Date.now() + TTL_MS,
		});

		return {
			nonceId,
			nonce,
			expiresInSeconds: Math.floor(TTL_MS / 1000),
		};
	}

	consume(nonceId: string): string | null {
		this.pruneExpired();

		const session = this.sessions.get(nonceId);
		if (!session) {
			return null;
		}

		this.sessions.delete(nonceId);
		if (session.expiresAt < Date.now()) {
			return null;
		}

		return session.nonce;
	}

	private pruneExpired(): void {
		const now = Date.now();
		for (const [key, session] of this.sessions.entries()) {
			if (session.expiresAt < now) {
				this.sessions.delete(key);
			}
		}
	}
}
