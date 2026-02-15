import { InviteCodeInvalidError } from '@spaces/domain/errors/invite-code-invalid.error';
import { InviteCodeNotFoundError } from '@spaces/domain/errors/invite-code-not-found.error';
import { SpaceMember } from '@spaces/domain/space-member.entity';

import {
	SPACE_INVITE_CODE_REPOSITORY,
	SpaceInviteCodeRepository,
} from '@spaces/application/ports/space-invite-code/space-invite-code.repository';
import {
	SPACE_MEMBER_REPOSITORY,
	SpaceMemberRepository,
} from '@spaces/application/ports/space-member/space-member.repository';

import { Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	code: string;
	userId: string;
};

export class AcceptSpaceInviteCodeUseCase {
	constructor(
		@Inject(SPACE_INVITE_CODE_REPOSITORY)
		private readonly spaceInviteCodeRepository: SpaceInviteCodeRepository,

		@Inject(SPACE_MEMBER_REPOSITORY)
		private readonly spaceMemberRepository: SpaceMemberRepository,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const foundCode = await this.spaceInviteCodeRepository.findOneByCode(cmd.code);
			if (!foundCode) {
				throw new InviteCodeNotFoundError();
			}
			if (!foundCode.canBeUsed()) {
				throw new InviteCodeInvalidError();
			}

			const alreadyMember = await this.spaceMemberRepository.findOne(
				cmd.userId,
				foundCode.spaceId,
			);
			if (alreadyMember) {
				return;
			}

			const member = new SpaceMember({ userId: cmd.userId, spaceId: foundCode.spaceId });
			await this.spaceMemberRepository.add(member);
			foundCode.use();
			await this.spaceInviteCodeRepository.update(foundCode);
		});
	}
}
