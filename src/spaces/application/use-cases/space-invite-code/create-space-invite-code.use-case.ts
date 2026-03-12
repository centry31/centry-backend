import { randomBytes } from 'crypto';

import { SpaceInviteCode } from '@spaces/domain/space-invite-code.entity';
import { InviteCode } from '@spaces/domain/value-objects/invite-code.vo';

import {
	SPACE_INVITE_CODE_REPOSITORY,
	SpaceInviteCodeRepository,
} from '@spaces/application/ports/space-invite-code/space-invite-code.repository';

import { Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
	createdByUserId: string;
};

export class CreateSpaceInviteCodeUseCase {
	constructor(
		@Inject(SPACE_INVITE_CODE_REPOSITORY)
		private readonly spaceInviteCodeRepository: SpaceInviteCodeRepository,
	) {}

	async execute(cmd: Cmd): Promise<SpaceInviteCode> {
		return runUseCase(async () => {
			const code = randomBytes(8).toString('base64url');
			const spaceInviteCode = new SpaceInviteCode({
				code: new InviteCode(code),
				spaceId: cmd.spaceId,
				createdByUserId: cmd.createdByUserId,
			});
			return this.spaceInviteCodeRepository.create(spaceInviteCode);
		});
	}
}
