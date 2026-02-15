import { InviteCodeNotFoundError } from '@spaces/domain/errors/invite-code-not-found.error';

import {
	SPACE_INVITE_CODE_REPOSITORY,
	SpaceInviteCodeRepository,
} from '@spaces/application/ports/space-invite-code/space-invite-code.repository';

import { Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
	code: string;
};

export class DeleteSpaceInviteCodeUseCase {
	constructor(
		@Inject(SPACE_INVITE_CODE_REPOSITORY)
		private spaceInviteCodeRepository: SpaceInviteCodeRepository,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const foundCode = await this.spaceInviteCodeRepository.findOneByCode(cmd.code);
			if (!foundCode || foundCode.spaceId !== cmd.spaceId) {
				throw new InviteCodeNotFoundError();
			}

			await this.spaceInviteCodeRepository.delete(cmd.spaceId, cmd.code);
		});
	}
}
