import { UserNotFoundError } from 'users/domain/errors/user-not-found.error';

import { USER_REPOSITORY, UserRepository } from '@users/application/ports/user/user.repository';

import { Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	userId: string;
};

export class CompleteOnboardingUseCase {
	constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const user = await this.userRepository.findById(cmd.userId);
			if (!user) throw new UserNotFoundError();

			user.changeIsOnboardingCompleted(true);
			await this.userRepository.update(user);
		});
	}
}
