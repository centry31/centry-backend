import { Inject } from '@nestjs/common';

import { Space } from '@spaces/domain/space.entity';

import { SPACE_REPOSITORY } from '@spaces/application/ports/space/space.repository';
import { SpaceRepository } from '@spaces/application/ports/space/space.repository';
import { GetSpaceCommand } from '@spaces/application/commands/space/get-space.command';

export class GetSpaceUseCase {
	constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository) {}

	async execute(cmd: GetSpaceCommand): Promise<Space> {
		return this.spaceRepository.findById(cmd.spaceId);
	}
}
