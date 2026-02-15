import { SpaceNotFoundError } from '@spaces/domain/errors/space-not-found.error';

import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';
import {
	SPACE_MEMBER_REPOSITORY,
	SpaceMemberRepository,
} from '@spaces/application/ports/space-member/space-member.repository';

import { ForbiddenException, Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
	userId: string;
};

export class RemoveSpaceMemberUseCase {
	constructor(
		@Inject(SPACE_MEMBER_REPOSITORY)
		private readonly spaceMemberRepository: SpaceMemberRepository,

		@Inject(SPACE_REPOSITORY)
		private readonly spaceRepository: SpaceRepository,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const space = await this.spaceRepository.findById(cmd.spaceId);
			if (!space) {
				throw new SpaceNotFoundError();
			}
			if (space.ownerId === cmd.userId) {
				throw new ForbiddenException('Нельзя удалить владельца пространства');
			}

			await this.spaceMemberRepository.remove(cmd.userId, cmd.spaceId);
		});
	}
}
