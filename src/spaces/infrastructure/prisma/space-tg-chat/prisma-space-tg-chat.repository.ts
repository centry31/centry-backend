import type { SpaceTgChat } from '@spaces/domain/space-tg-chat.entity';

import type { SpaceTgChatRepository } from '@spaces/application/ports/space-tg-chat/space-tg-chat.repository';

import { toDomain, toPersistence } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaSpaceTgChatRepository implements SpaceTgChatRepository {
	constructor(private readonly prisma: PrismaService) {}

	async getManyBySpaceId(spaceId: string): Promise<SpaceTgChat[]> {
		const rows = await this.prisma.spaceTgChat.findMany({ where: { spaceId } });
		return rows.map((row) => toDomain(row));
	}

	async hasBySpaceId(spaceId: string): Promise<boolean> {
		const row = await this.prisma.spaceTgChat.findFirst({
			where: { spaceId },
			select: { id: true },
		});
		return !!row;
	}

	async findSpaceIdsWithChats(spaceIds: string[]): Promise<string[]> {
		if (spaceIds.length === 0) {
			return [];
		}

		const rows = await this.prisma.spaceTgChat.findMany({
			where: { spaceId: { in: spaceIds } },
			select: { spaceId: true },
			distinct: ['spaceId'],
		});

		return rows.map((row) => row.spaceId);
	}

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
