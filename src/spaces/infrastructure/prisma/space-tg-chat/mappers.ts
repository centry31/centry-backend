import { SpaceTgChat } from '@spaces/domain/space-tg-chat.entity';
import { DateTime } from '@spaces/domain/value-objects/date-time.vo';
import { MessageThreadId } from '@spaces/domain/value-objects/message-thread-id.vo';
import { TgId } from '@spaces/domain/value-objects/tg-chat-id.vo';
import type { TgChatType } from '@spaces/domain/value-objects/tg-chat-type.vo';

type SpaceTgChatRow = {
	id: string;
	spaceId: string;

	chatTgId: bigint;
	chatType: 'private' | 'group' | 'supergroup' | 'channel';
	chatTitle: string | null;

	messageThreadId: number;

	initiatedByTgId: bigint;
	isActive: boolean;

	createdAt: Date;
	updatedAt: Date;
};

export const toDomain = (row: SpaceTgChatRow): SpaceTgChat => {
	return new SpaceTgChat({
		id: row.id,
		spaceId: row.spaceId,

		chatId: TgId.from(row.chatTgId),
		type: row.chatType as TgChatType,
		title: row.chatTitle,

		messageThreadId: MessageThreadId.from(row.messageThreadId),

		initiatedByTgId: TgId.from(row.initiatedByTgId),

		isActive: row.isActive,
		createdAt: DateTime.fromDate(row.createdAt),
		updatedAt: DateTime.fromDate(row.updatedAt),
	});
};

export const toPersistence = (chat: SpaceTgChat): SpaceTgChatRow => {
	return {
		id: chat.id,
		spaceId: chat.spaceId,

		chatTgId: chat.chatId.value,
		chatType: chat.type,
		chatTitle: chat.title ?? null,

		messageThreadId: chat.messageThreadId.value,

		initiatedByTgId: chat.initiatedByTgId.value,
		isActive: chat.isActive,

		createdAt: chat.createdAt.value,
		updatedAt: chat.updatedAt.value,
	};
};
