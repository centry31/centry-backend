import * as crypto from 'crypto';

import { Space } from '@spaces/domain/space.entity';
import { SpaceName } from '@spaces/domain/value-objects/space-name.vo';
import { SpaceMember } from 'spaces/domain/space-member.entity';

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
	name: string;
	description?: string;
	ownerId: string;
};

export class CreateSpaceUseCase {
	constructor(
		@Inject(SPACE_REPOSITORY)
		private readonly spaceRepository: SpaceRepository,

		@Inject(SPACE_MEMBER_REPOSITORY)
		private readonly spaceMemberRepository: SpaceMemberRepository,
	) {}

	async execute(cmd: Cmd): Promise<Space> {
		const nameVo = new SpaceName(cmd.name);
		const space = new Space({
			id: crypto.randomUUID(),
			name: nameVo,
			description: cmd.description,
			ownerId: cmd.ownerId,
		});
		const spaceMember = new SpaceMember({ spaceId: space.id, userId: cmd.ownerId });

		await this.spaceRepository.create(space);
		await this.spaceMemberRepository.add(spaceMember);

		return space;
	}
}
