import crypto from 'crypto';

import { SpaceTgChat } from 'spaces/domain/space-tg-chat.entity';
import { DateTime } from 'spaces/domain/value-objects/date-time.vo';
import { MessageThreadId } from 'spaces/domain/value-objects/message-thread-id.vo';
import { TgId } from 'spaces/domain/value-objects/tg-chat-id.vo';
import type { TgChatType } from 'spaces/domain/value-objects/tg-chat-type.vo';

import {
	SPACE_TG_CHAT_LINK_CODE_REPOSITORY,
	SpaceTgChatLinkCodeRepository,
} from '@spaces/application/ports/space-tg-chat-link-code/space-tg-chat-link-code.repository';
import {
	SPACE_TG_CHAT_REPOSITORY,
	SpaceTgChatRepository,
} from 'spaces/application/ports/space-tg-chat/space-tg-chat.repository';

import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

type Cmd = {
	code: string;

	spaceId: string;
	chatId: string;
	initiatedByTgId: string;
	chatType: string;
	title?: string;
	messageThreadId?: number;
};

export class UseSpaceTgChatLinkCodeUseCase {
	constructor(
		@Inject(SPACE_TG_CHAT_LINK_CODE_REPOSITORY)
		private readonly spaceTgChatLinkCodeRepository: SpaceTgChatLinkCodeRepository,

		@Inject(SPACE_TG_CHAT_REPOSITORY)
		private readonly spaceTgChatRepository: SpaceTgChatRepository,
	) {}

	private async validateLinkCode(code: string) {
		if (!code || !code.includes('.')) throw new Error('Некорректный формат кода');

		const [id, secret] = code.split('.', 2);
		if (!id || !secret) throw new Error('Некорректный формат кода');

		const spaceTgChatLinkCode = await this.spaceTgChatLinkCodeRepository.findById(id);
		if (!spaceTgChatLinkCode) throw new Error('Код не найден');
		if (!spaceTgChatLinkCode.canBeUsed()) throw new Error('Код устарел');

		const ok = await bcrypt.compare(secret, spaceTgChatLinkCode.hashCode);
		if (!ok) throw new Error('Код не найден');

		return spaceTgChatLinkCode;
	}

	async execute(cmd: Cmd): Promise<void> {
		const spaceTgChatLinkCode = await this.validateLinkCode(cmd.code);
		spaceTgChatLinkCode.use();
		await this.spaceTgChatLinkCodeRepository.update(spaceTgChatLinkCode);

		const chatIdVo = TgId.from(cmd.chatId);
		const initiatedByTgIdVo = TgId.from(cmd.initiatedByTgId);
		const messageThreadIdVo = MessageThreadId.from(cmd.messageThreadId);

		const spaceTgChat = new SpaceTgChat({
			id: crypto.randomUUID(),
			title: cmd.title,
			spaceId: cmd.spaceId,
			chatId: chatIdVo,
			initiatedByTgId: initiatedByTgIdVo,
			messageThreadId: messageThreadIdVo,
			type: cmd.chatType as TgChatType,
			createdAt: DateTime.now(),
		});
		await this.spaceTgChatRepository.create(spaceTgChat);
	}
}
