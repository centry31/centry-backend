import * as crypto from 'crypto';

import { Event } from 'calendar/domain/event.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	REMINDER_PLANNING,
	ReminderPlanning,
} from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import { TG_NOTIFIER, TgNotifier } from 'calendar/application/ports/tg-notifier/tg-notifier.port';

import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
	type RecurrenceConfig,
	RecurrenceService,
} from 'calendar/application/services/recurrence/recurrence.service';
import { runUseCase } from 'common/application/errors/run-use-case';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

/**
 * Команда создания нового события/серии.
 */
type Cmd = {
	title: string;
	description: string | null;

	start: Date;
	duration: number;
	timeZone: string;
	recurrence: RecurrenceConfig;

	spaceId: string;
	createdById: string;

	reminders: Reminder[];

	isNotifyMessage?: boolean;
	notifyMessage?: string;
};

type Reminder = {
	offsetMinutes: number;
};

/**
 * Данные, подготовленные до сохранения и побочных действий.
 */
type CreateBuildData = {
	event: Event;
	activeTargets: Awaited<ReturnType<SpaceTgChatQuery['getActiveTargetsBySpaceId']>>;
};

/**
 * Создает событие и запускает первичное планирование reminders.
 *
 * Также опционально отправляет уведомление о создании в Telegram.
 */
@Injectable()
export class CreateEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(SPACE_TG_CHAT_QUERY)
		private readonly spaceTgChatQuery: SpaceTgChatQuery,

		@Inject(REMINDER_PLANNING)
		private readonly reminderPlanningService: ReminderPlanning,

		@Inject(TG_NOTIFIER)
		private readonly tgNotifier: TgNotifier,

		private readonly recurrenceService: RecurrenceService,
	) {}

	/**
	 * Формирует текст информационного Telegram-сообщения о создании события.
	 */
	private buildNotifyMessage = (event: Event, notifyMessage?: string) => {
		const start = event.start.value;
		const end = new Date(start.getTime() + event.duration * 60_000);

		const formatDate = (date: Date) =>
			date.toLocaleString('ru-RU', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				timeZone: event.timeZone,
			});

		return [
			`📅 <b>Новое событие</b>`,
			`<b>${event.title}</b>`,
			event.description ? `📝 ${event.description}` : null,
			`🕒 <b>Начало:</b> ${formatDate(start)}`,
			`⏳ <b>Конец:</b> ${formatDate(end)}`,
			notifyMessage ? `💬 ${notifyMessage}` : null,
		]
			.filter(Boolean)
			.join('\n');
	};

	/**
	 * Основной процесс создания:
	 * - валидация предусловий и нормализация повторений;
	 * - сохранение события и reminders;
	 * - планирование reminders;
	 * - опциональная отправка notify-сообщений.
	 */
	async execute(cmd: Cmd): Promise<Event> {
		return runUseCase(async () => {
			const buildData = await this.buildCreateData(cmd);
			const createdEvent = await this.applyCreateOperations(buildData.event);
			await this.applyCreateEffects(createdEvent.id);

			if (cmd.isNotifyMessage) {
				for (const targetChat of buildData.activeTargets) {
					await this.tgNotifier.send({
						chatId: targetChat.chatId,
						messageThreadId: targetChat.messageThreadId,
						text: this.buildNotifyMessage(createdEvent, cmd.notifyMessage),
					});
				}
			}

			return createdEvent;
		});
	}

	/**
	 * Собирает валидную доменную модель и контекст для побочных действий.
	 */
	private async buildCreateData(cmd: Cmd): Promise<CreateBuildData> {
		const activeTargets = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(cmd.spaceId);

		const hasReminderPayload = cmd.reminders.length > 0;
		const hasNoActiveTargets = activeTargets.length === 0;
		const remindersWithoutTarget = hasReminderPayload && hasNoActiveTargets;
		if (remindersWithoutTarget) {
			throw new HttpException(
				'Для добавления напоминаний нужно привязать ТГ канал',
				HttpStatus.BAD_REQUEST,
			);
		}

		const startVo = DateTime.fromDate(cmd.start);
		const createdAtVo = DateTime.now();
		this.ensureRecurrenceUntilValid(cmd.recurrence, cmd.start, cmd.duration);
		this.recurrenceService.validateTimeZone(cmd.timeZone);
		const rrule = this.recurrenceService.buildRRule({
			recurrence: cmd.recurrence,
			start: cmd.start,
			timeZone: cmd.timeZone,
		});

		const event = new Event({
			id: crypto.randomUUID(),
			title: cmd.title,
			description: cmd.description ?? undefined,
			start: startVo,
			rrule: rrule ?? undefined,
			timeZone: cmd.timeZone,
			duration: cmd.duration,
			spaceId: cmd.spaceId,
			createdById: cmd.createdById,
			createdAt: createdAtVo,
		});

		const reminders = cmd.reminders.map(
			(reminder) =>
				new EventReminder({
					id: crypto.randomUUID(),
					eventId: event.id,
					createdAt: createdAtVo,
					offsetMinutes: reminder.offsetMinutes,
					updatedAt: createdAtVo,
				}),
		);
		for (const reminder of reminders) {
			event.addReminder(reminder);
		}

		return {
			event,
			activeTargets,
		};
	}

	/**
	 * Сохраняет агрегат события.
	 */
	private async applyCreateOperations(event: Event): Promise<Event> {
		return this.eventRepository.create(event);
	}

	/**
	 * Запускает планирование reminder jobs для нового события.
	 */
	private async applyCreateEffects(eventId: string): Promise<void> {
		await this.reminderPlanningService.replanEvent(eventId);
	}

	/**
	 * Проверяет, что `recurrence.until` не раньше конца события для повторяющихся событий.
	 */
	private ensureRecurrenceUntilValid(
		recurrence: RecurrenceConfig,
		start: Date,
		duration: number,
	): void {
		const isRecurring = recurrence.type !== 'NONE';
		const eventEnd = new Date(start.getTime() + duration * 60_000);
		const hasInvalidUntil =
			isRecurring &&
			recurrence.until instanceof Date &&
			!Number.isNaN(recurrence.until.getTime()) &&
			recurrence.until.getTime() < eventEnd.getTime();
		if (hasInvalidUntil) {
			throw new HttpException(
				'recurrence.until должен быть не раньше конца события',
				HttpStatus.BAD_REQUEST,
			);
		}
	}
}
