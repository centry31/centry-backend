/**
 * Payload отправки сообщения в Telegram для календарного модуля.
 */
export type SendTgNotifyCmd = {
	chatId: string;
	messageThreadId: string;
	text: string;
};

/**
 * Абстракция шлюза отправки уведомлений.
 */
export interface TgNotifier {
	send(cmd: SendTgNotifyCmd): Promise<void>;
}

export const TG_NOTIFIER = Symbol('TG_NOTIFIER');
