import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	spaceId: string;
};

export class DeleteSpaceUseCase {
	constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository) {}

	async execute(cmd: Cmd): Promise<void> {
		await this.spaceRepository.delete(cmd.spaceId);
	}
}
