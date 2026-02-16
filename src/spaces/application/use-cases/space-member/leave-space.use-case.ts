import { SpaceMemberLeaveError } from '@spaces/domain/errors/space-member-leave.error';

import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';
import {
	SPACE_MEMBER_REPOSITORY,
	SpaceMemberRepository,
} from '@spaces/application/ports/space-member/space-member.repository';

import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

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
		return runUseCase(async () => {
			const space = await this.spaceRepository.findById(cmd.spaceId);
			if (!space) {
				throw new NotFoundException('Пространство не найдено');
			}

			const member = await this.spaceMemberRepository.findOne(cmd.userId, cmd.spaceId);
			if (!member) {
				throw new SpaceMemberLeaveError();
			}
			if (space.ownerId === cmd.userId) {
				throw new BadRequestException('Владелец пространства не может выйти');
			}

			await this.spaceMemberRepository.remove(cmd.userId, cmd.spaceId);
		});
	}
}
