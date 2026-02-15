import * as crypto from 'crypto';

import { SpaceTgChatLinkCode } from '@spaces/domain/space-tg-chat-link-code';
import { DateTime } from 'spaces/domain/value-objects/date-time.vo';
import { ExpiresAt } from 'spaces/domain/value-objects/expires-at.vo';

import {
	SPACE_TG_CHAT_LINK_CODE_REPOSITORY,
	SpaceTgChatLinkCodeRepository,
} from 'spaces/application/ports/space-tg-chat-link-code/space-tg-chat-link-code.repository';

import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { addMinutes } from 'date-fns';

const DEFAULT_MAX_USES = 1;

type Cmd = {
	spaceId: string;
	userId: string;
};

export class CreateSpaceTgChatLinkCodeUseCase {
	constructor(
		@Inject(SPACE_TG_CHAT_LINK_CODE_REPOSITORY)
		private readonly spaceTgChatLinkCodeRepository: SpaceTgChatLinkCodeRepository,
	) {}

	async execute(cmd: Cmd): Promise<string> {
		const secret = crypto.randomBytes(16).toString('hex');
		const hashCode = await bcrypt.hash(secret, 10);
		const expiresAt = addMinutes(new Date(), 15);

		const tgChatLinkCode = new SpaceTgChatLinkCode({
			id: crypto.randomUUID(),
			hashCode,
			expiresAt: new ExpiresAt(expiresAt),
			spaceId: cmd.spaceId,
			createdByUserId: cmd.userId,
			createdAt: DateTime.now(),
			maxUses: DEFAULT_MAX_USES,
		});

		await this.spaceTgChatLinkCodeRepository.create(tgChatLinkCode);

		// возвращаем в UI «id.secret», сам secret не храним
		return `${tgChatLinkCode.id}.${secret}`;
	}
}
