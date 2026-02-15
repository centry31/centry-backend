import type { SpaceTgChat } from 'spaces/domain/space-tg-chat.entity';

import {
	SPACE_TG_CHAT_REPOSITORY,
	type SpaceTgChatRepository,
} from 'spaces/application/ports/space-tg-chat/space-tg-chat.repository';

import { Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
};

// TODO: сейчас можно получить кому угодно список (нужно поставить только для владельца)
export class GetSpaceTgChatsUseCase {
	constructor(
		@Inject(SPACE_TG_CHAT_REPOSITORY)
		private readonly spaceTgChatRepository: SpaceTgChatRepository,
	) {}

	async execute(cmd: Cmd): Promise<SpaceTgChat[]> {
		return runUseCase(async () => {
			const spaceTgChats = await this.spaceTgChatRepository.getManyBySpaceId(cmd.spaceId);
			return spaceTgChats;
		});
	}
}
