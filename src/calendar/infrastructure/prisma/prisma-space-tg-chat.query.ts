import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import type { SpaceTgChatQuery, SpaceTgChatTarget } from 'spaces';

/**
 * Prisma-адаптер для запросов активных Telegram-целей по space.
 */
@Injectable()
export class PrismaSpaceTgChatQuery implements SpaceTgChatQuery {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Проверяет, что у space есть хотя бы одна TG-привязка.
	 */
	async hasBySpaceId(spaceId: string): Promise<boolean> {
		const row = await this.prisma.spaceTgChat.findFirst({
			where: { spaceId },
			select: { id: true },
		});
		return !!row;
	}

	/**
	 * Возвращает активные chat/thread цели для уведомлений.
	 */
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
