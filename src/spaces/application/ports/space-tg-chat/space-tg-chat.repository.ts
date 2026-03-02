import type { SpaceTgChat } from '@spaces/domain/space-tg-chat.entity';

export interface SpaceTgChatRepository {
	getManyBySpaceId(spaceId: string): Promise<SpaceTgChat[]>;
	hasBySpaceId(spaceId: string): Promise<boolean>;
	findSpaceIdsWithChats(spaceIds: string[]): Promise<string[]>;

	create(chat: SpaceTgChat): Promise<SpaceTgChat>;
	update(chat: SpaceTgChat): Promise<void>;
	delete(id: string, spaceId: string): Promise<void>;
}
export const SPACE_TG_CHAT_REPOSITORY = Symbol('SPACE_TG_CHAT_REPOSITORY');
