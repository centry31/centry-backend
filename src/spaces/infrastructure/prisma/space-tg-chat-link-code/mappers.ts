import { SpaceTgChatLinkCode } from '@spaces/domain/space-tg-chat-link-code.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';
import { ExpiresAt } from 'spaces/domain/value-objects/expires-at.vo';

type Row = {
	id: string;
	spaceId: string;
	hashCode: string;
	createdByUserId: string;
	expiresAt: Date;
	createdAt: Date;

	usedAt: Date | null;
	maxUses: number;
	usedCount: number;
};

export const toDomain = (row: Row): SpaceTgChatLinkCode =>
	new SpaceTgChatLinkCode({
		id: row.id,
		spaceId: row.spaceId,
		hashCode: row.hashCode,
		createdByUserId: row.createdByUserId,
		expiresAt: new ExpiresAt(row.expiresAt),
		createdAt: DateTime.fromDate(row.createdAt),

		maxUses: row.maxUses,
		usedCount: row.usedCount,
		usedAt: row.usedAt ? DateTime.fromDate(row.usedAt) : undefined,
	});

export const toPersistence = (spaceTgChatLinkCode: SpaceTgChatLinkCode): Row => ({
	id: spaceTgChatLinkCode.id,
	spaceId: spaceTgChatLinkCode.spaceId,
	hashCode: spaceTgChatLinkCode.hashCode,
	createdByUserId: spaceTgChatLinkCode.createdByUserId,
	expiresAt: spaceTgChatLinkCode.expiresAt.value,
	createdAt: spaceTgChatLinkCode.createdAt.value,

	maxUses: spaceTgChatLinkCode.maxUses,
	usedCount: spaceTgChatLinkCode.usedCount,
	usedAt: spaceTgChatLinkCode.usedAt?.value ?? null,
});
