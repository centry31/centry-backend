import { Inject } from '@nestjs/common';

import {
	SPACE_INVITE_CODE_REPOSITORY,
	SpaceInviteCodeRepository,
} from '@spaces/application/ports/space-invite-code/space-invite-code.repository';
import { GetActiveSpaceInviteCodesCommand } from '@spaces/application/commands/space-invite-code/get-active-space-invite-codes.command';

import { SpaceInviteCode } from '@spaces/domain/space-invite-code.entity';

export class GetActiveSpaceInviteCodesUseCase {
	constructor(
		@Inject(SPACE_INVITE_CODE_REPOSITORY)
		private readonly spaceInviteCodeRepository: SpaceInviteCodeRepository,
	) {}

	async execute(cmd: GetActiveSpaceInviteCodesCommand): Promise<SpaceInviteCode[]> {
		return this.spaceInviteCodeRepository.findActiveBySpace(cmd.spaceId);
	}
}
