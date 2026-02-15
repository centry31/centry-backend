import type { SpaceTgChat } from '@spaces/domain/space-tg-chat.entity';

export interface SpaceTgChatRepository {
	create(chat: SpaceTgChat): Promise<SpaceTgChat>;
	update(chat: SpaceTgChat): Promise<void>;
}
export const SPACE_TG_CHAT_REPOSITORY = Symbol('SPACE_TG_CHAT_REPOSITORY');
