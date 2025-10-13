import { Inject } from '@nestjs/common';

import { Space } from '@spaces/domain/space.entity';

import { SPACE_REPOSITORY } from '@spaces/application/ports/space/space.repository';
import { SpaceRepository } from '@spaces/application/ports/space/space.repository';
import { GetUserSpacesCommand } from '@spaces/application/commands/space/get-user-spaces.command';

export class GetUserSpacesUseCase {
	constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository) {}

	async execute(cmd: GetUserSpacesCommand): Promise<Space[]> {
		return this.spaceRepository.findManyByMembershipUserId(cmd.userId);
	}
}
