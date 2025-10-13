import { Inject } from '@nestjs/common';

import {
	SPACE_INVITE_CODE_REPOSITORY,
	SpaceInviteCodeRepository,
} from '@spaces/application/ports/space-invite-code/space-invite-code.repository';
import { AcceptSpaceInviteCodeCommand } from '@spaces/application/commands/space-invite-code/accept-space-invite-code.command';
import {
	SPACE_MEMBER_REPOSITORY,
	SpaceMemberRepository,
} from '@spaces/application/ports/space-member/space-member.repository';

import { SpaceMember } from '@spaces/domain/space-member.entity';
import { InviteCodeNotFoundError } from '@spaces/domain/errors/invite-code-not-found.error';
import { InviteCodeInvalidError } from '@spaces/domain/errors/invite-code-invalid.error';

export class AcceptSpaceInviteCodeUseCase {
	constructor(
		@Inject(SPACE_INVITE_CODE_REPOSITORY)
		private readonly spaceInviteCodeRepository: SpaceInviteCodeRepository,

		@Inject(SPACE_MEMBER_REPOSITORY)
		private readonly spaceMemberRepository: SpaceMemberRepository,
	) {}

	async execute(cmd: AcceptSpaceInviteCodeCommand): Promise<void> {
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
			// ничего не делаем
			return;
		}

		const member = new SpaceMember({ userId: cmd.userId, spaceId: foundCode.spaceId });
		await this.spaceMemberRepository.add(member);
		foundCode.markUsed();
		await this.spaceInviteCodeRepository.update(foundCode);
	}
}
