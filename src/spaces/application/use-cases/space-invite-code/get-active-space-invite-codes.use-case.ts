import type { SpaceInviteCode } from '@spaces/domain/space-invite-code.entity';

import {
	SPACE_INVITE_CODE_REPOSITORY,
	SpaceInviteCodeRepository,
} from '@spaces/application/ports/space-invite-code/space-invite-code.repository';

import { Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
};

export class GetActiveSpaceInviteCodesUseCase {
	constructor(
		@Inject(SPACE_INVITE_CODE_REPOSITORY)
		private readonly spaceInviteCodeRepository: SpaceInviteCodeRepository,
	) {}

	async execute(cmd: Cmd): Promise<SpaceInviteCode[]> {
		return runUseCase(async () => {
			return this.spaceInviteCodeRepository.findActiveBySpace(cmd.spaceId);
		});
	}
}
