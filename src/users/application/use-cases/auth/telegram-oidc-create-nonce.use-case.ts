import { TelegramOidcNonceStore } from '@users/application/use-cases/auth/telegram-oidc-nonce.store';

import { Injectable } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Result = {
	nonceId: string;
	nonce: string;
	expiresInSeconds: number;
};

@Injectable()
export class TelegramOidcCreateNonceUseCase {
	constructor(private readonly nonceStore: TelegramOidcNonceStore) {}

	async execute(): Promise<Result> {
		return runUseCase(async () => this.nonceStore.create());
	}
}
