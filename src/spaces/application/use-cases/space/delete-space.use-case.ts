import { Inject } from '@nestjs/common';

import { SPACE_REPOSITORY } from '@spaces/application/ports/space/space.repository';
import { SpaceRepository } from '@spaces/application/ports/space/space.repository';
import { DeleteSpaceCommand } from '@spaces/application/commands/space/delete-space.command';

export class DeleteSpaceUseCase {
	constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository) {}

	async execute(cmd: DeleteSpaceCommand): Promise<void> {
		await this.spaceRepository.delete(cmd.spaceId);
	}
}
