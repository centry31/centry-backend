import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import type { SpaceTgChat, TgChatType, User } from '@prisma/client';

@Injectable()
export class SpaceTgChatsRepository {
	constructor(private readonly prismaService: PrismaService) {}

	findUserById(userId: string): Promise<User | null> {
		return this.prismaService.user.findUnique({ where: { id: userId } });
	}

	upsertSpaceTgChat(params: {
		spaceId: string;
		chatTgId: bigint;
		messageThreadId: number;
		chatType: TgChatType;
		chatTitle: string;
		initiatedByTgId: bigint;
		isActive: boolean;
	}): Promise<SpaceTgChat> {
		const {
			spaceId,
			chatTgId,
			messageThreadId,
			chatType,
			chatTitle,
			initiatedByTgId,
			isActive,
		} = params;

		return this.prismaService.spaceTgChat.upsert({
			where: {
				spaceId_chatTgId_messageThreadId: {
					spaceId,
					chatTgId,
					messageThreadId,
				},
			},
			update: {
				chatType,
				chatTitle,
				initiatedByTgId,
				isActive,
			},
			create: {
				spaceId,
				chatTgId,
				chatType,
				chatTitle,
				messageThreadId,
				initiatedByTgId,
				isActive,
			},
		});
	}

	deleteSpaceTgChat(where: { id: string; spaceId: string }) {
		return this.prismaService.spaceTgChat.delete({
			where,
			include: { space: true },
		});
	}

	findManyBySpaceId(spaceId: string) {
		return this.prismaService.spaceTgChat.findMany({ where: { spaceId } });
	}
}
