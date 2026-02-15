import type { SpaceTgChat } from '@spaces/domain/space-tg-chat.entity';

import type { SpaceTgChatRepository } from '@spaces/application/ports/space-tg-chat/space-tg-chat.repository';

import { toDomain, toPersistence } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaSpaceTgChatRepository implements SpaceTgChatRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(chat: SpaceTgChat): Promise<SpaceTgChat> {
		const data = toPersistence(chat);
		const row = await this.prisma.spaceTgChat.create({ data });
		return toDomain(row);
	}

	async update(chat: SpaceTgChat): Promise<void> {
		const data = toPersistence(chat);
		await this.prisma.spaceTgChat.update({
			where: { id: chat.id, spaceId: chat.spaceId },
			data,
		});
	}
}
