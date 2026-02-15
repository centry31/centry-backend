import { SpaceNotFoundError } from '@spaces/domain/errors/space-not-found.error';
import type { Space } from '@spaces/domain/space.entity';

import {
	SPACE_REPOSITORY,
	SpaceRepository,
} from '@spaces/application/ports/space/space.repository';
import {
	SPACE_TG_CHAT_REPOSITORY,
	SpaceTgChatRepository,
} from '@spaces/application/ports/space-tg-chat/space-tg-chat.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	spaceId: string;
};

type Result = {
	space: Space;
	hasTelegramChats: boolean;
};

export class GetSpaceUseCase {
	constructor(
		@Inject(SPACE_REPOSITORY) private readonly spaceRepository: SpaceRepository,
		@Inject(SPACE_TG_CHAT_REPOSITORY)
		private readonly spaceTgChatRepository: SpaceTgChatRepository,
	) {}

	async execute(cmd: Cmd): Promise<Result> {
		const space = await this.spaceRepository.findById(cmd.spaceId);
		if (!space) {
			throw new SpaceNotFoundError();
		}

		const hasTelegramChats = await this.spaceTgChatRepository.hasBySpaceId(space.id);
		return { space, hasTelegramChats };
	}
}
