import type {
	ReminderTgNotifier,
	SendTelegramReminderCmd,
} from 'calendar/application/ports/reminder-tg-notifier/reminder-tg-notifier.port';

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class HttpReminderNotifier implements ReminderTgNotifier {
	private readonly logger = new Logger(HttpReminderNotifier.name);
	private readonly endpointUrl: string;
	private readonly apiToken?: string;

	constructor(private readonly configService: ConfigService) {
		const baseUrl =
			this.configService.get<string>('TELEGRAM_BOT_SERVER_URL') ||
			this.configService.get<string>('TG_BOT_SERVICE_URL');
		const path =
			this.configService.get<string>('TELEGRAM_BOT_REMINDER_PATH') ||
			this.configService.get<string>('TG_BOT_REMINDER_PATH') ||
			'/reminders';

		if (!baseUrl) {
			throw new InternalServerErrorException(
				'TELEGRAM_BOT_SERVER_URL (or TG_BOT_SERVICE_URL) is not configured',
			);
		}

		this.endpointUrl = this.joinUrl(baseUrl, path);
		this.apiToken =
			this.configService.get<string>('TELEGRAM_BOT_API_TOKEN') ||
			this.configService.get<string>('TG_API_TOKEN');
	}

	async send(cmd: SendTelegramReminderCmd): Promise<void> {
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
				`Reminder sent to chatId=${cmd.chatId} threadId=${cmd.messageThreadId}`,
			);
		} catch (error) {
			const status = error?.response?.status;
			const responseData = error?.response?.data;

			this.logger.error(
				`Reminder send failed url=${this.endpointUrl} chatId=${cmd.chatId} threadId=${cmd.messageThreadId} status=${status}`,
			);
			if (responseData) {
				this.logger.error(`Reminder send response: ${JSON.stringify(responseData)}`);
			}
			throw error;
		}
	}

	private joinUrl(baseUrl: string, path: string): string {
		const normalizedBase = baseUrl.replace(/\/+$/, '');
		const normalizedPath = path.replace(/^\/+/, '');
		return `${normalizedBase}/${normalizedPath}`;
	}
}
