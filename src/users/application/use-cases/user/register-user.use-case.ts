import * as crypto from 'crypto';

import { User } from '@users/domain/user.entity';
import { TelegramId as TgId } from 'common/domain/value-objects/telegram-id.vo';

import { USER_REPOSITORY, UserRepository } from '@users/application/ports/user/user.repository';

import { ConflictException, Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	tgId: string | number | bigint;
	displayName: string;
	username?: string | null;
};

export class RegisterUserUseCase {
	constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

	async execute(cmd: Cmd): Promise<User> {
		return runUseCase(async () => {
			const tg = TgId.fromBigInt(cmd.tgId);

			const existing = await this.userRepository.findByTgId(tg.value);
			if (existing) {
				throw new ConflictException(`User with tgId ${tg.value} already exists`);
			}

			const user = new User({
				id: crypto.randomUUID(),
				tgId: tg,
				displayName: cmd.displayName,
				username: cmd.username,
				isOnboardingCompleted: false,
			});

			return this.userRepository.create(user);
		});
	}
}
