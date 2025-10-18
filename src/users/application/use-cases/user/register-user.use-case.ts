import * as crypto from 'crypto';

import { User } from '@users/domain/user.entity';
import { TgId } from '@users/domain/value-objests/tg-id.vo';

import { USER_REPOSITORY, UserRepository } from '@users/application/ports/user/user.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	tgId: string | number | bigint;
	displayName: string;
	username?: string | null;
};

export class RegisterUserUseCase {
	constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

	async execute(cmd: Cmd): Promise<User> {
		const tg = TgId.fromBigInt(cmd.tgId);

		const existing = await this.userRepository.findByTgId(tg.value);
		if (existing) {
			// Можно вернуть существующего или бросить ошибку
			throw new Error(`User with tgId ${tg.value} already exists`);
		}

		const user = new User({
			id: crypto.randomUUID(),
			tgId: tg,
			displayName: cmd.displayName,
			username: cmd.username,
		});

		return this.userRepository.create(user);
	}
}
