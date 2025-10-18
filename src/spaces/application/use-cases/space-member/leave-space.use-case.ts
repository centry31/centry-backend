import { SpaceMemberLeaveError } from '@spaces/domain/errors/space-member-leave.error';

import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';
import {
	SPACE_MEMBER_REPOSITORY,
	SpaceMemberRepository,
} from '@spaces/application/ports/space-member/space-member.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	spaceId: string;
	userId: string;
};

export class LeaveSpaceUseCase {
	constructor(
		@Inject(SPACE_MEMBER_REPOSITORY)
		private readonly spaceMemberRepository: SpaceMemberRepository,
		@Inject(SPACE_REPOSITORY)
		private readonly spaceRepository: SpaceRepository,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		const member = await this.spaceMemberRepository.findOne(cmd.userId, cmd.spaceId);
		if (!member) {
			throw new SpaceMemberLeaveError();
		}

		await this.spaceMemberRepository.remove(cmd.userId, cmd.spaceId);
	}
}
