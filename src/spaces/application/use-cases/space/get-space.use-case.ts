import type { Space } from '@spaces/domain/space.entity';

import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	spaceId: string;
};

export class GetSpaceUseCase {
	constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository) {}

	async execute(cmd: Cmd): Promise<Space> {
		return this.spaceRepository.findById(cmd.spaceId);
	}
}
