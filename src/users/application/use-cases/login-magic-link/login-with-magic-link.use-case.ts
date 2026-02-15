import { LoginMagicLinkInvalidError } from '@users/domain/errors/login-magic-link-invalid.error';
import { LoginMagicLinkNotFoundError } from '@users/domain/errors/login-magic-link-not-found.error';
import { UserNotFoundError } from '@users/domain/errors/user-not-found.error';

import { TOKEN_SERVICE, TokenService } from '@users/application/ports/jwt/token.service';
import {
	LOGIN_MAGIC_LINK_REPOSITORY,
	LoginMagicLinkRepository,
} from '@users/application/ports/login-magic-link/login-magic-link.repository';
import { USER_REPOSITORY, UserRepository } from '@users/application/ports/user/user.repository';

import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

type Cmd = {
	magicLink: string;
};

export class LoginWithMagicLinkUseCase {
	constructor(
		@Inject(LOGIN_MAGIC_LINK_REPOSITORY)
		private readonly loginMagicLinkRepository: LoginMagicLinkRepository,

		@Inject(USER_REPOSITORY)
		private readonly userRepository: UserRepository,

		@Inject(TOKEN_SERVICE)
		private readonly tokenService: TokenService,
	) {}

	async execute(cmd: Cmd): Promise<string> {
		const { magicLink } = cmd;

		if (!magicLink.includes('.')) {
			throw new LoginMagicLinkInvalidError();
		}

		const [id, rawCode] = magicLink.split('.', 2);
		if (!id || !rawCode) {
			throw new LoginMagicLinkInvalidError();
		}

		const loginMagicLink = await this.loginMagicLinkRepository.findById(id);
		if (!loginMagicLink) {
			throw new LoginMagicLinkNotFoundError();
		}
		if (!loginMagicLink.canBeUsed()) {
			throw new LoginMagicLinkNotFoundError();
		}

		const ok = await bcrypt.compare(rawCode, loginMagicLink.hashCode.value);
		if (!ok) {
			throw new LoginMagicLinkNotFoundError();
		}

		loginMagicLink.markUsed();
		await this.loginMagicLinkRepository.update(loginMagicLink);

		const user = await this.userRepository.findById(loginMagicLink.userId);
		if (!user) {
			throw new UserNotFoundError();
		}

		const payload = { id: user.id };
		const token = this.tokenService.sign(payload);
		return token;
	}
}
