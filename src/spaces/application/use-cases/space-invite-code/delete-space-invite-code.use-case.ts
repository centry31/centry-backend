import {
	SPACE_INVITE_CODE_REPOSITORY,
	SpaceInviteCodeRepository,
} from '@spaces/application/ports/space-invite-code/space-invite-code.repository';

import { Inject } from '@nestjs/common';

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
		await this.spaceInviteCodeRepository.delete(cmd.spaceId, cmd.code);
	}
}
