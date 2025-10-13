import { Inject } from '@nestjs/common';

import { Space } from '@spaces/domain/space.entity';

import { SPACE_REPOSITORY } from '@spaces/application/ports/space/space.repository';
import { SpaceRepository } from '@spaces/application/ports/space/space.repository';
import { UpdateSpaceCommand } from '@spaces/application/commands/space/update-space.command';
import { SpaceName } from '@spaces/domain/value-objects/space-name.vo';

export class UpdateSpaceUseCase {
	constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository) {}

	async execute(cmd: UpdateSpaceCommand): Promise<void> {
		const space = new Space({
			id: cmd.spaceId,
			ownerId: cmd.ownerId,
			name: new SpaceName(cmd.name),
			description: cmd.description,
		});
		await this.spaceRepository.update(space);
	}
}
