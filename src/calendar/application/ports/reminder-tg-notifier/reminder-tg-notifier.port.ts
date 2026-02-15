export type SendTelegramReminderCmd = {
	chatId: string;
	messageThreadId: string;
	text: string;
};

export interface ReminderTgNotifier {
	send(cmd: SendTelegramReminderCmd): Promise<void>;
}

export const REMINDER_TG_NOTIFIER = Symbol('REMINDER_TG_NOTIFIER');
