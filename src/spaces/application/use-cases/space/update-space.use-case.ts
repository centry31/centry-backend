import { Space } from '@spaces/domain/space.entity';
import { SpaceName } from '@spaces/domain/value-objects/space-name.vo';

import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	spaceId: string;
	ownerId: string;
	name: string;
	description?: string;
};

export class UpdateSpaceUseCase {
	constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository) {}

	async execute(cmd: Cmd): Promise<void> {
		const space = new Space({
			id: cmd.spaceId,
			ownerId: cmd.ownerId,
			name: new SpaceName(cmd.name),
			description: cmd.description,
		});
		await this.spaceRepository.update(space);
	}
}
