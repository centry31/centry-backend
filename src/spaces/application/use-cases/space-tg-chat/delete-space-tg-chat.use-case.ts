import {
	SPACE_TG_CHAT_REPOSITORY,
	SpaceTgChatRepository,
} from 'spaces/application/ports/space-tg-chat/space-tg-chat.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	id: string;
	spaceId: string;
};

export class DeleteSpaceTgChatUseCase {
	constructor(
		@Inject(SPACE_TG_CHAT_REPOSITORY)
		private readonly spaceTgChatRepository: SpaceTgChatRepository,
	) {}

	async execute(cmd: Cmd) {
		await this.spaceTgChatRepository.delete(cmd.id, cmd.spaceId);
	}
}
