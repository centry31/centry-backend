import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * BotAdapter
 * ==========
 * Адаптер для общения с Telegram Bot API (через backend-шлюз).
 *
 * Особенности реализации:
 *  - Используется axios-инстанс с базовым URL из `TG_BOT_URL`.
 *  - В каждый запрос автоматически добавляется заголовок `Cookie: x-bot-token=<TG_API_TOKEN>`
 *    для аутентификации.
 *
 * Методы:
 *  - sendMessage(chatId, text, extra?) — отправка сообщения в указанный чат.
 *
 * Логирование:
 *  - Успешные отправки пишутся в debug-лог.
 *  - Ошибки пишутся в error-лог.
 *
 * Использование:
 *  - Внедряется как сервис NestJS через DI.
 *  - Может переиспользоваться любыми процессорами/сервисами, которым нужно отправить сообщение в TG.
 */

@Injectable()
export class BotAdapter {
	private readonly logger = new Logger(BotAdapter.name);
	private readonly baseUrl = process.env.TG_BOT_URL;
	private readonly client: AxiosInstance;

	constructor() {
		this.client = axios.create({
			baseURL: this.baseUrl,
			headers: {
				Cookie: `x-bot-token=${process.env.TG_API_TOKEN}`,
			},
		});
	}

	/**
	 * Отправляет сообщение в Telegram-чат.
	 *
	 * @param chatId {string} - ID чата в Telegram (числовой или строковый)
	 * @param messageThreadId {string} - ID топика в Telegram
	 * @param text {string} -  Основной текст сообщения
	 */
	async sendMessage(chatId: string, messageThreadId: string, text: string) {
		try {
			await this.client.post(`${this.baseUrl}/sendMessage`, {
				chatId,
				messageThreadId,
				text,
			});
			this.logger.debug(`Sent message to chat ${chatId}`);
		} catch (e) {
			this.logger.error(`Failed to send message: ${e}`);
		}
	}
}
