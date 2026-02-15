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
	userId: string;
};

type Result = {
	space: Space;
	hasTelegramChats: boolean;
};

export class GetUserSpacesUseCase {
	constructor(
		@Inject(SPACE_REPOSITORY)
		private readonly spaceRepository: SpaceRepository,

		@Inject(SPACE_TG_CHAT_REPOSITORY)
		private readonly spaceTgChatRepository: SpaceTgChatRepository,
	) {}

	async execute(cmd: Cmd): Promise<Result[]> {
		const spaces = await this.spaceRepository.findManyByMembershipUserId(cmd.userId);
		const spaceIdsWithChats = await this.spaceTgChatRepository.findSpaceIdsWithChats(
			spaces.map((space) => space.id),
		);
		const spaceIdsWithChatsSet = new Set(spaceIdsWithChats);

		return spaces.map((space) => ({
			space,
			hasTelegramChats: spaceIdsWithChatsSet.has(space.id),
		}));
	}
}
