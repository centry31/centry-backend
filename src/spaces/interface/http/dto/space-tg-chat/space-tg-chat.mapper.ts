import type { SpaceTgChat } from 'spaces/domain/space-tg-chat.entity';

type SpaceTgChatResponse = {
	id: string;
	spaceId: string;

	title?: string;

	isActive?: boolean;
	createdAt?: Date;
	updatedAt?: Date;
};

export const toSpaceTgChatResponse = (spaceTgChat: SpaceTgChat): SpaceTgChatResponse => ({
	id: spaceTgChat.id,
	spaceId: spaceTgChat.spaceId,

	title: spaceTgChat.title,

	isActive: spaceTgChat.isActive,
	createdAt: spaceTgChat.createdAt.value,
	updatedAt: spaceTgChat.updatedAt.value,
});
