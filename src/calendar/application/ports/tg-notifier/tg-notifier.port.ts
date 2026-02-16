export type SendTgNotifyCmd = {
	chatId: string;
	messageThreadId: string;
	text: string;
};

export interface TgNotifier {
	send(cmd: SendTgNotifyCmd): Promise<void>;
}

export const TG_NOTIFIER = Symbol('TG_NOTIFIER');
