import * as crypto from 'crypto';

import { Event } from 'calendar/domain/event.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	EVENT_EXCEPTION_REPOSITORY,
	EventExceptionRepository,
} from 'calendar/application/ports/event-exception/event-exception.repository';
import {
	REMINDER_PLANNING,
	ReminderPlanning,
} from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { RecurrenceConfig } from 'calendar/application/services/recurrence/recurrence.service';
import { RecurrenceService } from 'calendar/application/services/recurrence/recurrence.service';
import { runUseCase } from 'common/application/errors/run-use-case';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

const REMINDER_TARGETS_REQUIRED_ERROR = 'Для добавления напоминаний нужно привязать ТГ канал';

/**
 * Данные reminder в команде обновления.
 */
type ReminderInput = {
	offsetMinutes: number;
};

/**
 * Команда полного обновления.
 *
 * Здесь намеренно используется детерминированное полное обновление, а не частичное.
 */
type Cmd = {
	eventId: string;
	spaceId: string;
	title: string;
	description?: string;
	start: Date;
	duration: number;
	timeZone: string;
	recurrence: RecurrenceConfig;
	reminders: ReminderInput[];
	scope: 'SERIES' | 'THIS' | 'THIS_AND_FUTURE';
	occurrenceStart?: Date;
};

/**
 * Обновляет события по области изменения (`scope`):
 * - `SERIES`: переписать всю серию;
 * - `THIS`: идемпотентно обновить исключение и `detached`-замену;
 * - `THIS_AND_FUTURE`: разделить серию с выбранного инстанса.
 */
@Injectable()
export class UpdateEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(EVENT_EXCEPTION_REPOSITORY)
		private readonly eventExceptionRepository: EventExceptionRepository,

		@Inject(REMINDER_SCHEDULER)
		private readonly reminderScheduler: ReminderScheduler,

		@Inject(REMINDER_PLANNING)
		private readonly reminderPlanningService: ReminderPlanning,

		@Inject(SPACE_TG_CHAT_QUERY)
		private readonly spaceTgChatQuery: SpaceTgChatQuery,

		private readonly recurrenceService: RecurrenceService,
	) {}

	/**
	 * Основной роутинг логики обновления.
	 */
	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const event = await this.eventRepository.findByIdWithSpaceId(cmd.eventId, cmd.spaceId);
			if (!event) {
				throw new NotFoundException('Событие не найдено');
			}

			await this.ensureReminderTargetsIfNeeded(cmd.spaceId, cmd.reminders);
			this.recurrenceService.validateTimeZone(cmd.timeZone);
			this.ensureRecurrenceUntilValid(cmd.recurrence, cmd.start);

			if (cmd.scope === 'SERIES' || !event.isRecurring()) {
				await this.applySeriesUpdate(event, cmd);
				return;
			}

			const occurrenceStart = this.requireOccurrenceStart(cmd);
			const inSeries = this.recurrenceService.isOccurrenceInSeries({
				start: event.start.value,
				rrule: event.rrule,
				timeZone: event.timeZone,
				occurrenceStart,
			});
			if (!inSeries) {
				throw new HttpException(
					'occurrenceStart не входит в серию',
					HttpStatus.BAD_REQUEST,
				);
			}

			if (cmd.scope === 'THIS') {
				await this.applyThisUpdate(event, occurrenceStart, cmd);
				return;
			}

			await this.applyFutureUpdate(event, occurrenceStart, cmd);
		});
	}

	/**
	 * Проверяет, что у операций с областью (`scope`) есть валидный якорь инстанса.
	 */
	private requireOccurrenceStart(cmd: Cmd): Date {
		const hasOccurrenceStart =
			cmd.occurrenceStart instanceof Date && !Number.isNaN(cmd.occurrenceStart.getTime());
		if (!hasOccurrenceStart) {
			throw new HttpException(
				'occurrenceStart обязателен для THIS/THIS_AND_FUTURE',
				HttpStatus.BAD_REQUEST,
			);
		}

		return cmd.occurrenceStart;
	}

	/**
	 * Полностью заменяет определение серии.
	 *
	 * Побочные действия:
	 * - удаляются `detached`-инстансы;
	 * - удаляются исключения;
	 * - снимается планирование удаленных reminders;
	 * - выполняется перепланирование reminders корневой серии.
	 */
	private async applySeriesUpdate(event: Event, cmd: Cmd): Promise<void> {
		const previousReminderIds = event.reminders.map((reminder) => reminder.id);
		this.applyPatchToExistingEvent(event, cmd);

		const removedReminderIds = this.collectRemovedReminderIds(
			previousReminderIds,
			event.reminders,
		);
		const deletedDetached = await this.eventRepository.deleteDetachedByOriginEventId(event.id);
		await this.eventExceptionRepository.deleteByEventId(event.id);
		await this.eventRepository.update(event);

		const detachedReminderIds = deletedDetached.flatMap((detached) =>
			detached.reminders.map((reminder) => reminder.id),
		);
		for (const reminderId of [...removedReminderIds, ...detachedReminderIds]) {
			await this.reminderScheduler.unschedule(reminderId);
		}

		await this.reminderPlanningService.replanEvent(event.id);
	}

	/**
	 * Переписывает один слот серии через идемпотентное обновление исключения и `detached`-замены.
	 *
	 * Идемпотентность:
	 * - тот же `(eventId, occurrenceStart)` обновляет существующий `detached`, если он есть;
	 * - иначе `detached` создается один раз.
	 */
	private async applyThisUpdate(event: Event, occurrenceStart: Date, cmd: Cmd): Promise<void> {
		await this.eventExceptionRepository.upsert(event.id, occurrenceStart);

		const detached = await this.eventRepository.findDetachedByOrigin(event.id, occurrenceStart);
		if (detached) {
			const previousReminderIds = detached.reminders.map((reminder) => reminder.id);
			this.applyPatchToDetachedEvent(detached, event, occurrenceStart, cmd);
			await this.eventRepository.update(detached);

			const removedReminderIds = this.collectRemovedReminderIds(
				previousReminderIds,
				detached.reminders,
			);
			for (const reminderId of removedReminderIds) {
				await this.reminderScheduler.unschedule(reminderId);
			}

			await this.reminderPlanningService.replanEvent(event.id);
			await this.reminderPlanningService.replanEvent(detached.id);
			return;
		}

		const detachedEvent = this.createDetachedEvent({
			originEvent: event,
			occurrenceStart,
			cmd,
		});
		await this.eventRepository.create(detachedEvent);
		await this.reminderPlanningService.replanEvent(event.id);
		await this.reminderPlanningService.replanEvent(detachedEvent.id);
	}

	/**
	 * Делит повторяющуюся серию в точке `occurrenceStart`.
	 *
	 * Правила:
	 * - если точка разделения равна старту серии, это эквивалент `SERIES`;
	 * - иначе:
	 *   1) старой серии ставится `UNTIL=previous occurrence`;
	 *   2) создается новая tail-серия из данных команды;
	 *   3) будущие исключения и `detached`-связи переносятся в хвост.
	 */
	private async applyFutureUpdate(event: Event, occurrenceStart: Date, cmd: Cmd): Promise<void> {
		const isFromSeriesStart = occurrenceStart.getTime() === event.start.value.getTime();
		if (isFromSeriesStart) {
			await this.applySeriesUpdate(event, cmd);
			return;
		}

		const previousOccurrence = this.recurrenceService.getPreviousOccurrence({
			start: event.start.value,
			rrule: event.rrule,
			timeZone: event.timeZone,
			occurrenceStart,
		});
		if (!previousOccurrence) {
			throw new HttpException(
				'Не удалось найти предыдущий инстанс для split',
				HttpStatus.BAD_REQUEST,
			);
		}

		event.changeRecurrence(
			this.recurrenceService.setUntil({
				start: event.start.value,
				rrule: event.rrule,
				timeZone: event.timeZone,
				until: previousOccurrence,
			}),
		);
		await this.eventRepository.update(event);

		const tailEvent = this.createTailEvent({
			originEvent: event,
			cmd,
		});
		await this.eventRepository.create(tailEvent);

		await this.eventExceptionRepository.moveFutureToEvent({
			sourceEventId: event.id,
			targetEventId: tailEvent.id,
			fromOccurrenceStart: occurrenceStart,
		});
		const movedDetachedIds = await this.eventRepository.reassignDetachedAfterOccurrence(
			event.id,
			tailEvent.id,
			occurrenceStart,
		);

		await this.reminderPlanningService.replanEvent(event.id);
		await this.reminderPlanningService.replanEvent(tailEvent.id);
		for (const detachedId of movedDetachedIds) {
			await this.reminderPlanningService.replanEvent(detachedId);
		}
	}

	/**
	 * Применяет полные данные команды к существующему событию.
	 */
	private applyPatchToExistingEvent(event: Event, cmd: Cmd): void {
		event.changeTitle(cmd.title);
		event.changeDescription(cmd.description);
		event.changeTimeRange(DateTime.fromDate(cmd.start), cmd.duration);
		event.changeTimeZone(cmd.timeZone);
		event.changeRecurrence(
			this.recurrenceService.buildRRule({
				recurrence: cmd.recurrence,
				start: cmd.start,
				timeZone: cmd.timeZone,
			}) ?? undefined,
		);
		event.replaceReminders(this.createReminders(cmd.reminders, event.id));
	}

	/**
	 * Применяет полные данные команды к `detached`-событию.
	 *
	 * `detached` всегда одноразовый (`rrule` очищается).
	 */
	private applyPatchToDetachedEvent(
		detached: Event,
		originEvent: Event,
		occurrenceStart: Date,
		cmd: Cmd,
	): void {
		detached.changeTitle(cmd.title);
		detached.changeDescription(cmd.description);
		detached.changeTimeRange(DateTime.fromDate(cmd.start), cmd.duration);
		detached.changeTimeZone(cmd.timeZone);
		detached.changeRecurrence(undefined);
		detached.setDetachedLink(originEvent.id, DateTime.fromDate(occurrenceStart));
		detached.replaceReminders(this.createReminders(cmd.reminders, detached.id));
	}

	/**
	 * Создает новую хвостовую повторяющуюся серию после разделения.
	 */
	private createTailEvent(params: { originEvent: Event; cmd: Cmd }): Event {
		const { originEvent, cmd } = params;
		const createdAt = DateTime.now();
		const tailId = crypto.randomUUID();

		return new Event({
			id: tailId,
			title: cmd.title,
			description: cmd.description,
			start: DateTime.fromDate(cmd.start),
			rrule:
				this.recurrenceService.buildRRule({
					recurrence: cmd.recurrence,
					start: cmd.start,
					timeZone: cmd.timeZone,
				}) ?? undefined,
			timeZone: cmd.timeZone,
			duration: cmd.duration,
			spaceId: originEvent.spaceId,
			createdById: originEvent.createdById,
			createdAt,
			reminders: this.createReminders(cmd.reminders, tailId, createdAt),
		});
	}

	/**
	 * Создает одноразовую `detached`-замену для одного исходного инстанса.
	 */
	private createDetachedEvent(params: {
		originEvent: Event;
		occurrenceStart: Date;
		cmd: Cmd;
	}): Event {
		const { originEvent, occurrenceStart, cmd } = params;
		const createdAt = DateTime.now();
		const detachedId = crypto.randomUUID();

		return new Event({
			id: detachedId,
			title: cmd.title,
			description: cmd.description,
			start: DateTime.fromDate(cmd.start),
			timeZone: cmd.timeZone,
			rrule: undefined,
			duration: cmd.duration,
			spaceId: originEvent.spaceId,
			createdById: originEvent.createdById,
			createdAt,
			detachedFromEventId: originEvent.id,
			detachedFromOccurrenceStart: DateTime.fromDate(occurrenceStart),
			reminders: this.createReminders(cmd.reminders, detachedId, createdAt),
		});
	}

	/**
	 * Создает reminder-сущности из данных запроса.
	 */
	private createReminders(
		reminders: ReminderInput[],
		eventId: string,
		createdAt: DateTime = DateTime.now(),
	): EventReminder[] {
		return reminders.map(
			(reminder) =>
				new EventReminder({
					id: crypto.randomUUID(),
					eventId,
					offsetMinutes: reminder.offsetMinutes,
					createdAt,
					updatedAt: createdAt,
				}),
		);
	}

	/**
	 * Вычисляет ids reminders, удаленных в результате обновления.
	 */
	private collectRemovedReminderIds(
		beforeReminderIds: string[],
		afterReminders: readonly EventReminder[],
	): string[] {
		const afterIds = new Set(afterReminders.map((reminder) => reminder.id));
		return beforeReminderIds.filter((id) => !afterIds.has(id));
	}

	/**
	 * Проверяет, что reminders можно задавать только при наличии активной TG-цели.
	 */
	private async ensureReminderTargetsIfNeeded(
		spaceId: string,
		reminders: ReminderInput[],
	): Promise<void> {
		if (reminders.length === 0) {
			return;
		}

		const activeTargets = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(spaceId);
		if (activeTargets.length === 0) {
			throw new HttpException(REMINDER_TARGETS_REQUIRED_ERROR, HttpStatus.BAD_REQUEST);
		}
	}

	/**
	 * Проверяет, что `recurrence.until` не раньше `start` для повторяющихся событий.
	 */
	private ensureRecurrenceUntilValid(recurrence: RecurrenceConfig, start: Date): void {
		const isRecurring = recurrence.type !== 'NONE';
		const hasInvalidUntil =
			isRecurring &&
			recurrence.until instanceof Date &&
			!Number.isNaN(recurrence.until.getTime()) &&
			recurrence.until.getTime() < start.getTime();
		if (hasInvalidUntil) {
			throw new HttpException(
				'recurrence.until должен быть не раньше start',
				HttpStatus.BAD_REQUEST,
			);
		}
	}
}
