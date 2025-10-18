import { UserNotFoundError } from '@users/domain/errors/user-not-found.error';
import type { User } from '@users/domain/user.entity';

import { USER_REPOSITORY, UserRepository } from '@users/application/ports/user/user.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	userId: string;
};

export class InitAuthUseCase {
	constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

	async execute(cmd: Cmd): Promise<User> {
		const user = await this.userRepository.findById(cmd.userId);
		if (!user) {
			throw new UserNotFoundError();
		}

		return user;
	}
}
