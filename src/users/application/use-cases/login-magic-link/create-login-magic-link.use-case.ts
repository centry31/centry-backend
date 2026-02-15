import { randomBytes } from 'crypto';

import { LoginMagicLink } from '@users/domain/login-magic-link.entity';
import { HashCode } from '@users/domain/value-objests/hash-code.vo';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import {
	LOGIN_MAGIC_LINK_REPOSITORY,
	LoginMagicLinkRepository,
} from '@users/application/ports/login-magic-link/login-magic-link.repository';

import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { addMinutes } from 'date-fns';

type Cmd = {
	userId: string;
};

export class CreateLoginMagicLinkUseCase {
	constructor(
		@Inject(LOGIN_MAGIC_LINK_REPOSITORY)
		private readonly loginMagicLinkRepository: LoginMagicLinkRepository,
	) {}

	async execute(cmd: Cmd): Promise<string> {
		const rawCode = randomBytes(8).toString('base64url');
		const hashCode = await bcrypt.hash(rawCode, 10);
		const expiresAt = addMinutes(new Date(), 10);

		const hashCodeVo = new HashCode(hashCode);
		const expiresAtVo = new DateTime(expiresAt);
		const createdAtVo = new DateTime(new Date());

		const loginMagicLink = new LoginMagicLink({
			id: crypto.randomUUID(),
			userId: cmd.userId,
			hashCode: hashCodeVo,
			expiresAt: expiresAtVo,
			createdAt: createdAtVo,
		});

		await this.loginMagicLinkRepository.create(loginMagicLink);
		return `${loginMagicLink.id}.${rawCode}`;
	}
}
