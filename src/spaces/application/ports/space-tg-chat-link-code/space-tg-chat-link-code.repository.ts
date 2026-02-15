import type { SpaceTgChatLinkCode } from 'spaces/domain/space-tg-chat-link-code';

export interface SpaceTgChatLinkCodeRepository {
	findById(id: string): Promise<SpaceTgChatLinkCode | null>;
	create(linkCode: SpaceTgChatLinkCode): Promise<SpaceTgChatLinkCode>;
	update(linkCode: SpaceTgChatLinkCode): Promise<void>;
}
export const SPACE_TG_CHAT_LINK_CODE_REPOSITORY = Symbol('SPACE_TG_CHAT_LINK_CODE_REPOSITORY');
