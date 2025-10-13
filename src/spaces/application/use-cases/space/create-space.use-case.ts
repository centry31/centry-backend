import { Inject } from '@nestjs/common';
import * as crypto from 'crypto';

import { SpaceName } from '@spaces/domain/value-objects/space-name.vo';
import { Space } from '@spaces/domain/space.entity';

import { CreateSpaceCommand } from '@spaces/application/commands/space/create-space.command';
import { SPACE_REPOSITORY } from '@spaces/application/ports/space/space.repository';
import { SpaceRepository } from '@spaces/application/ports/space/space.repository';

export class CreateSpaceUseCase {
	constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository) {}

	async execute(cmd: CreateSpaceCommand): Promise<Space> {
		const nameVo = new SpaceName(cmd.name);
		const space = new Space({
			id: crypto.randomUUID(),
			name: nameVo,
			description: cmd.description,
			ownerId: cmd.ownerId,
		});
		return this.spaceRepository.create(space);
	}
}
