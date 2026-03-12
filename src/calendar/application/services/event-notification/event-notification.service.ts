import type { Event } from 'calendar/domain/event.entity';

import { TG_NOTIFIER, TgNotifier } from 'calendar/application/ports/tg-notifier/tg-notifier.port';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseRruleWithSourceOrThrow } from 'calendar/application/services/rrule/parse-rrule.helper';
import { Frequency } from 'rrule';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

type EventReminderSnapshot = { offsetMinutes: number };

type EventNotificationSnapshot = {
	title: string;
	description?: string;
	start: Date;
	duration: number;
	timeZone: string;
	rrule?: string;
	reminders: EventReminderSnapshot[];
};

type CreateNotificationParams = {
	spaceId: string;
	scope: 'ONE' | 'SERIES';
	event: EventNotificationSnapshot;
	customMessage?: string;
};

type UpdateNotificationParams = {
	spaceId: string;
	scope: 'ONE' | 'THIS' | 'THIS_AND_FUTURE';
	before: EventNotificationSnapshot;
	after: EventNotificationSnapshot;
	customMessage?: string;
};

type DeleteNotificationParams = {
	spaceId: string;
	scope: 'ONE' | 'THIS' | 'SERIES';
	event: EventNotificationSnapshot;
	customMessage?: string;
};

@Injectable()
export class EventNotificationService {
	private readonly logger = new Logger(EventNotificationService.name);

	constructor(
		@Inject(SPACE_TG_CHAT_QUERY)
		private readonly spaceTgChatQuery: SpaceTgChatQuery,

		@Inject(TG_NOTIFIER)
		private readonly tgNotifier: TgNotifier,
	) {}

	toSnapshot(event: Event, startOverride?: Date): EventNotificationSnapshot {
		return {
			title: event.title,
			description: event.description,
			start: startOverride ?? event.start.value,
			duration: event.duration,
			timeZone: event.timeZone,
			rrule: event.rrule,
			reminders: event.reminders.map((reminder) => ({
				offsetMinutes: reminder.offsetMinutes,
			})),
		};
	}

	async notifyCreated(params: CreateNotificationParams): Promise<void> {
		try {
			const header =
				params.scope === 'SERIES'
					? '📅 <b>Создана серия событий</b>'
					: '📅 <b>Создано событие</b>';

			const text = this.buildMessage(header, params.event, undefined, params.customMessage);
			await this.dispatch(params.spaceId, text);
		} catch (error) {
			this.logger.error(
				`Ошибка отправки TG уведомления о создании, spaceId=${params.spaceId}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	async notifyUpdated(params: UpdateNotificationParams): Promise<void> {
		try {
			const header = this.getUpdateHeader(params.scope);
			const text = this.buildMessage(
				header,
				params.after,
				params.before,
				params.customMessage,
			);
			await this.dispatch(params.spaceId, text);
		} catch (error) {
			this.logger.error(
				`Ошибка отправки TG уведомления об обновлении, spaceId=${params.spaceId}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	async notifyDeleted(params: DeleteNotificationParams): Promise<void> {
		try {
			const header = this.getDeleteHeader(params.scope);
			const text = this.buildMessage(header, params.event, undefined, params.customMessage);
			await this.dispatch(params.spaceId, text);
		} catch (error) {
			this.logger.error(
				`Ошибка отправки TG уведомления об удалении, spaceId=${params.spaceId}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	private getUpdateHeader(scope: UpdateNotificationParams['scope']): string {
		switch (scope) {
			case 'THIS':
				return '✏️ <b>Обновлён один инстанс серии</b>';
			case 'THIS_AND_FUTURE':
				return '✏️ <b>Обновлены это и будущие события серии</b>';
			default:
				return '✏️ <b>Обновлено событие</b>';
		}
	}

	private getDeleteHeader(scope: DeleteNotificationParams['scope']): string {
		switch (scope) {
			case 'THIS':
				return '🗑 <b>Удалён один инстанс серии</b>';
			case 'SERIES':
				return '🗑 <b>Удалена серия событий</b>';
			default:
				return '🗑 <b>Удалено событие</b>';
		}
	}

	private buildMessage(
		header: string,
		after: EventNotificationSnapshot,
		before?: EventNotificationSnapshot,
		customMessage?: string,
	): string {
		const lines: string[] = [header];

		if (before) {
			lines.push('');
			lines.push('<b>Было:</b>');
			lines.push(...this.formatEventLines(before));
			lines.push('');
			lines.push('<b>Стало:</b>');
			lines.push(...this.formatEventLines(after));
		} else {
			lines.push(...this.formatEventLines(after));
		}

		if (customMessage) {
			lines.push('');
			lines.push(`💬 ${this.escapeHtml(customMessage)}`);
		}

		return lines.join('\n');
	}

	private formatEventLines(snapshot: EventNotificationSnapshot): string[] {
		const end = new Date(snapshot.start.getTime() + snapshot.duration * 60_000);

		return [
			`<b>${this.escapeHtml(snapshot.title)}</b>`,
			snapshot.description ? `📝 ${this.escapeHtml(snapshot.description)}` : '📝 -',
			`🕒 <b>Начало:</b> ${this.formatDate(snapshot.start, snapshot.timeZone)}`,
			`⏳ <b>Конец:</b> ${this.formatDate(end, snapshot.timeZone)}`,
			`🔁 <b>Повтор:</b> ${this.formatRecurrence(snapshot)}`,
			`⏰ <b>Напоминания:</b> ${this.formatReminders(snapshot.reminders)}`,
		];
	}

	private formatDate(date: Date, timeZone: string): string {
		return date.toLocaleString('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZone,
		});
	}

	private formatReminders(reminders: EventReminderSnapshot[]): string {
		if (!reminders.length) {
			return 'нет';
		}

		const sortedOffsets = reminders
			.map((reminder) => reminder.offsetMinutes)
			.sort((a, b) => a - b);

		return sortedOffsets.map((offset) => `за ${offset} мин`).join(', ');
	}

	private formatRecurrence(snapshot: EventNotificationSnapshot): string {
		if (!snapshot.rrule) {
			return 'нет';
		}

		try {
			const { sourceRule } = parseRruleWithSourceOrThrow(snapshot.rrule);
			const interval = sourceRule.options.interval ?? 1;
			const until = sourceRule.options.until;

			let base = 'по правилу';
			switch (sourceRule.options.freq) {
				case Frequency.DAILY:
					base = interval > 1 ? `раз в ${interval} дня` : 'ежедневно';
					break;
				case Frequency.WEEKLY:
					if (interval === 2) {
						base = 'раз в 2 недели';
						break;
					}
					base = interval > 1 ? `раз в ${interval} недели` : 'еженедельно';
					break;
				case Frequency.MONTHLY:
					base = interval > 1 ? `раз в ${interval} месяца` : 'ежемесячно';
					break;
			}

			if (!until) {
				return base;
			}

			return `${base} до ${this.formatDate(until, snapshot.timeZone)}`;
		} catch (error) {
			this.logger.warn(
				`Не удалось распарсить RRULE для уведомления: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			return 'по правилу';
		}
	}

	private escapeHtml(value: string): string {
		return value
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');
	}

	private async dispatch(spaceId: string, text: string): Promise<void> {
		const spaceTgChats = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(spaceId);
		if (!spaceTgChats.length) {
			this.logger.warn(`TG уведомление пропущено: нет активных чатов для spaceId=${spaceId}`);
			return;
		}

		const sendResults = await Promise.allSettled(
			spaceTgChats.map((chat) =>
				this.tgNotifier.send({
					text,
					chatId: chat.chatId,
					messageThreadId: chat.messageThreadId,
				}),
			),
		);

		const failedCount = sendResults.filter((result) => result.status === 'rejected').length;
		if (!failedCount) {
			return;
		}

		this.logger.error(
			`Не удалось отправить ${failedCount}/${spaceTgChats.length} TG уведомлений для spaceId=${spaceId}`,
		);
	}
}
