import { Inject } from '@nestjs/common';

import {
	SPACE_MEMBER_REPOSITORY,
	SpaceMemberRepository,
} from '@spaces/application/ports/space-member/space-member.repository';
import { RemoveSpaceMemberCommand } from '@spaces/application/commands/space-member/remove-space-member.command';
import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';

import { SpaceNotFoundError } from '@spaces/domain/errors/space-not-found.error';
import { SpaceMemberRemoveError } from '@spaces/domain/errors/space-member-remove.error';

export class RemoveSpaceMemberUseCase {
	constructor(
		@Inject(SPACE_MEMBER_REPOSITORY)
		private readonly spaceMemberRepository: SpaceMemberRepository,
		@Inject(SPACE_REPOSITORY)
		private readonly spaceRepository: SpaceRepository,
	) {}

	async execute(cmd: RemoveSpaceMemberCommand): Promise<void> {
		const space = await this.spaceRepository.findById(cmd.spaceId);
		if (!space) {
			throw new SpaceNotFoundError();
		}
		if (space.ownerId === cmd.userId) {
			throw new SpaceMemberRemoveError();
		}

		await this.spaceMemberRepository.remove(cmd.userId, cmd.spaceId);
	}
}
