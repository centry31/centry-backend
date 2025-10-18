import type { Space } from '@spaces/domain/space.entity';

import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	userId: string;
};

export class GetUserSpacesUseCase {
	constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository) {}

	async execute(cmd: Cmd): Promise<Space[]> {
		return this.spaceRepository.findManyByMembershipUserId(cmd.userId);
	}
}
