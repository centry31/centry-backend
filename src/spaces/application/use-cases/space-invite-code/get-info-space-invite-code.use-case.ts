import { Inject } from '@nestjs/common';

import {
	SPACE_INVITE_CODE_REPOSITORY,
	SpaceInviteCodeRepository,
} from '@spaces/application/ports/space-invite-code/space-invite-code.repository';
import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';
import { GetInfoSpaceInviteCodeCommand } from '@spaces/application/commands/space-invite-code/get-info-space-invite-code.command';

import { Space } from '@spaces/domain/space.entity';
import { InviteCodeNotFoundError } from 'spaces/domain/errors/invite-code-not-found.error';
import { InviteCodeInvalidError } from 'spaces/domain/errors/invite-code-invalid.error';

export class GetInfoSpaceInviteCodeUseCase {
	constructor(
		@Inject(SPACE_INVITE_CODE_REPOSITORY)
		private readonly spaceInviteCodeRepository: SpaceInviteCodeRepository,
		@Inject(SPACE_REPOSITORY)
		private readonly spaceRepository: SpaceRepository,
	) {}

	async execute(cmd: GetInfoSpaceInviteCodeCommand): Promise<Space> {
		const foundCode = await this.spaceInviteCodeRepository.findOneByCode(cmd.code);
		if (!foundCode) {
			throw new InviteCodeNotFoundError();
		}
		if (!foundCode.canBeUsed()) {
			throw new InviteCodeInvalidError();
		}

		const space = await this.spaceRepository.findById(cmd.code);
		if (!space) {
			throw new InviteCodeInvalidError();
		}

		return space;
	}
}
