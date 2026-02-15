import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';

import { Inject, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
};

export class DeleteSpaceUseCase {
	constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const existing = await this.spaceRepository.findById(cmd.spaceId);
			if (!existing) {
				throw new NotFoundException('Пространство не найдено');
			}

			await this.spaceRepository.delete(cmd.spaceId);
		});
	}
}
