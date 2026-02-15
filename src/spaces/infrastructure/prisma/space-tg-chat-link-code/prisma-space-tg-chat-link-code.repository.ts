import type { SpaceTgChatLinkCode } from '@spaces/domain/space-tg-chat-link-code';

import type { SpaceTgChatLinkCodeRepository } from '@spaces/application/ports/space-tg-chat-link-code/space-tg-chat-link-code.repository';

import { toDomain, toPersistence } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaSpaceTgChatLinkCodeRepository implements SpaceTgChatLinkCodeRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string): Promise<SpaceTgChatLinkCode | null> {
		const row = await this.prisma.spaceTgChatLinkCode.findUnique({ where: { id } });
		if (!row) return null;
		return toDomain(row);
	}

	async create(linkCode: SpaceTgChatLinkCode): Promise<SpaceTgChatLinkCode> {
		const data = toPersistence(linkCode);
		const row = await this.prisma.spaceTgChatLinkCode.create({ data });
		return toDomain(row);
	}

	async update(linkCode: SpaceTgChatLinkCode): Promise<void> {
		const data = toPersistence(linkCode);
		await this.prisma.spaceTgChatLinkCode.update({
			where: { id: linkCode.id, spaceId: linkCode.spaceId },
			data,
		});
	}
}
