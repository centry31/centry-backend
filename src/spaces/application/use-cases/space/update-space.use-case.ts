import { Space } from '@spaces/domain/space.entity';
import { SpaceName } from '@spaces/domain/value-objects/space-name.vo';

import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';

import { Inject, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
	ownerId: string;
	name: string;
	description?: string;
};

export class UpdateSpaceUseCase {
	constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const existing = await this.spaceRepository.findById(cmd.spaceId);
			if (!existing) {
				throw new NotFoundException('Пространство не найдено');
			}

			const space = new Space({
				id: cmd.spaceId,
				ownerId: cmd.ownerId,
				name: new SpaceName(cmd.name),
				description: cmd.description,
			});
			await this.spaceRepository.updateInfo(space);
		});
	}
}
