import type {
	SendTgNotifyCmd,
	TgNotifier,
} from 'calendar/application/ports/tg-notifier/tg-notifier.port';

import { ENV } from 'common/infrastructure/env';

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * HTTP-адаптер отправки уведомлений в Telegram.
 *
 * Отправляет reminders во внешний сервис бота.
 */
@Injectable()
export class HttpTgNotifier implements TgNotifier {
	private readonly logger = new Logger(HttpTgNotifier.name);
	private readonly endpointUrl: string;
	private readonly apiToken?: string;

	/**
	 * Инициализирует адрес отправки и проверяет обязательную конфигурацию.
	 */
	constructor() {
		const baseUrl = ENV.TG_BOT_SERVICE_URL;
		const path = '/reminders';

		if (!baseUrl) {
			throw new InternalServerErrorException(
				'TELEGRAM_BOT_SERVER_URL (or TG_BOT_SERVICE_URL) is not configured',
			);
		}

		this.endpointUrl = this.joinUrl(baseUrl, path);
		this.apiToken = ENV.TG_API_TOKEN;
	}

	/**
	 * Отправляет данные уведомления через HTTP POST.
	 */
	async send(cmd: SendTgNotifyCmd): Promise<void> {
		try {
			const headers = this.apiToken
				? {
						authorization: `Bearer ${this.apiToken}`,
						'x-api-token': this.apiToken,
				  }
				: undefined;

			await axios.post(
				this.endpointUrl,
				{
					chatId: cmd.chatId,
					messageThreadId: cmd.messageThreadId,
					text: cmd.text,
				},
				{
					headers,
					timeout: 10_000,
				},
			);

			this.logger.log(
				`TG message sent to chatId=${cmd.chatId} threadId=${cmd.messageThreadId}`,
			);
		} catch (error) {
			const status = error?.response?.status;
			const responseData = error?.response?.data;

			this.logger.error(
				`TG message send failed url=${this.endpointUrl} chatId=${cmd.chatId} threadId=${cmd.messageThreadId} status=${status}`,
			);
			if (responseData) {
				this.logger.error(`TG message send response: ${JSON.stringify(responseData)}`);
			}
			throw error;
		}
	}

	/**
	 * Нормализует склейку базового URL и пути запроса.
	 */
	private joinUrl(baseUrl: string, path: string): string {
		const normalizedBase = baseUrl.replace(/\/+$/, '');
		const normalizedPath = path.replace(/^\/+/, '');
		return `${normalizedBase}/${normalizedPath}`;
	}
}
