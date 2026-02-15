export type SpaceTgChatTarget = {
	chatId: string;
	messageThreadId: string;
};

export interface SpaceTgChatQuery {
	hasBySpaceId(spaceId: string): Promise<boolean>;
	getActiveTargetsBySpaceId(spaceId: string): Promise<SpaceTgChatTarget[]>;
}
export const SPACE_TG_CHAT_QUERY = Symbol('SPACE_TG_CHAT_QUERY');
