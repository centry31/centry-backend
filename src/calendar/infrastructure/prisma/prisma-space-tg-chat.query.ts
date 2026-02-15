import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import type { SpaceTgChatQuery, SpaceTgChatTarget } from 'spaces';

@Injectable()
export class PrismaSpaceTgChatQuery implements SpaceTgChatQuery {
	constructor(private readonly prisma: PrismaService) {}

	async hasBySpaceId(spaceId: string): Promise<boolean> {
		const row = await this.prisma.spaceTgChat.findFirst({
			where: { spaceId },
			select: { id: true },
		});
		return !!row;
	}

	async getActiveTargetsBySpaceId(spaceId: string): Promise<SpaceTgChatTarget[]> {
		const rows = await this.prisma.spaceTgChat.findMany({
			where: { spaceId, isActive: true },
			select: { chatTgId: true, messageThreadId: true },
		});

		return rows.map((row) => ({
			chatId: row.chatTgId.toString(),
			messageThreadId: String(row.messageThreadId),
		}));
	}
}
