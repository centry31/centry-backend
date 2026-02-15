export interface SpaceTgChatQuery {
	hasBySpaceId(spaceId: string): Promise<boolean>;
}
export const SPACE_TG_CHAT_QUERY = Symbol('SPACE_TG_CHAT_QUERY');
