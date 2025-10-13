import { Inject } from '@nestjs/common';

import {
	SPACE_INVITE_CODE_REPOSITORY,
	SpaceInviteCodeRepository,
} from '@spaces/application/ports/space-invite-code/space-invite-code.repository';
import { DeleteSpaceInviteCodeCommand } from '@spaces/application/commands/space-invite-code/delete-space-invite-code.command';

export class DeleteSpaceInviteCodeUseCase {
	constructor(
		@Inject(SPACE_INVITE_CODE_REPOSITORY)
		private spaceInviteCodeRepository: SpaceInviteCodeRepository,
	) {}

	async execute(cmd: DeleteSpaceInviteCodeCommand): Promise<void> {
		await this.spaceInviteCodeRepository.delete(cmd.spaceId, cmd.code);
	}
}
