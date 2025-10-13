import { Inject } from '@nestjs/common';
import { randomBytes } from 'crypto';

import {
	SPACE_INVITE_CODE_REPOSITORY,
	SpaceInviteCodeRepository,
} from '@spaces/application/ports/space-invite-code/space-invite-code.repository';
import { CreateSpaceInviteCodeCommand } from '@spaces/application/commands/space-invite-code/create-space-invite-code.command';

import { SpaceInviteCode } from '@spaces/domain/space-invite-code.entity';
import { InviteCode } from '@spaces/domain/value-objects/invite-code.vo';
import { ExpiresAt } from '@spaces/domain/value-objects/expires-at.vo';

export class CreateSpaceInviteCodeUseCase {
	constructor(
		@Inject(SPACE_INVITE_CODE_REPOSITORY)
		private readonly spaceInviteCodeRepository: SpaceInviteCodeRepository,
	) {}

	async execute(cmd: CreateSpaceInviteCodeCommand): Promise<SpaceInviteCode> {
		const code = randomBytes(8).toString('base64url');
		const spaceInviteCode = new SpaceInviteCode({
			code: new InviteCode(code),
			spaceId: cmd.spaceId,
			maxUses: cmd.maxUses,
			expiresAt: new ExpiresAt(cmd.expiresAt),
			createdByUserId: cmd.createdByUserId,
		});
		return this.spaceInviteCodeRepository.create(spaceInviteCode);
	}
}
