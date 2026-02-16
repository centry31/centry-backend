import type { DateTime } from 'common/domain/value-objects/date-time.vo';
import type { SpaceTgChat } from 'spaces/domain/space-tg-chat.entity';

type SpaceTgChatResponse = {
	id: string;
	spaceId: string;

	title?: string;

	isActive?: boolean;
	createdAt?: DateTime;
	updatedAt?: DateTime;
};

export const toSpaceTgChatResponse = (spaceTgChat: SpaceTgChat): SpaceTgChatResponse => ({
	id: spaceTgChat.id,
	spaceId: spaceTgChat.spaceId,

	title: spaceTgChat.title,

	isActive: spaceTgChat.isActive,
	createdAt: spaceTgChat.createdAt,
	updatedAt: spaceTgChat.updatedAt,
});
