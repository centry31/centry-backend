import type { Event } from 'calendar/domain/event.entity';
import type { EventOverride } from 'calendar/domain/event-override.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	EVENT_OVERRIDE_REPOSITORY,
	EventOverrideRepository,
} from 'calendar/application/ports/event-override/event-override.repository';
import {
	RECURRING_OVERRIDES,
	type RecurringOverrides,
} from 'calendar/application/ports/recurring-overrides/recurring-overrides.port';
import {
	REMINDER_PLANNING,
	ReminderPlanning,
} from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { materializeEventOrder } from '../helpers/event-series';
import type {
	UpdateEventBranchCmd,
	UpdateEventMutationOperation,
	UpdateEventMutationPlan,
	UpdateEventReminderInput,
} from './update-event-branches/update-event-branch.types';
import { UpdateRecurringFutureHeadBranchService } from './update-event-branches/update-recurring-future-head-branch.service';
import { UpdateRecurringFutureSplitBranchService } from './update-event-branches/update-recurring-future-split-branch.service';
import { UpdateRecurringOneBranchService } from './update-event-branches/update-recurring-one-branch.service';
import { UpdateSingleEventBranchService } from './update-event-branches/update-single-event-branch.service';

import { HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';
import { SPACE_TG_CHAT_QUERY, type SpaceTgChatQuery } from 'spaces';

const REPEAT_UNTIL_VALIDATION_ERROR =
	'repeatUntil должен быть не раньше start для повторяющихся событий';
const REMINDER_TARGETS_REQUIRED_ERROR = 'Для добавления напоминаний нужно привязать ТГ канал';
const UNSUPPORTED_FREQUENCY_CHANGE_ERROR = 'Изменение frequency в PATCH пока не поддерживается';

type Cmd = UpdateEventBranchCmd;

/**
 * Use-case обновления календарного события.
 *
 * Главная роль класса:
 * - принять команду PATCH;
 * - выбрать нужную ветку бизнес-правил (single / recurring ONE / recurring FUTURE);
 * - получить от branch-сервиса план мутаций;
 * - в одном месте применить DB-операции;
 * - в одном месте применить reminder-эффекты.
 *
 * Архитектурная граница:
 * - branch-сервисы не делают I/O и возвращают только план;
 * - use-case остается единственной точкой записи и сайд-эффектов.
 *
 * Поддерживаемые сценарии:
 * 1) Single event:
 *   - обновление обычного события;
 *   - reminders работают по PATCH-семантике (omit/clear/replace).
 * 2) Recurring + ONE:
 *   - меняется один инстанс серии;
 *   - создается detached NEVER-событие;
 *   - исходный order помечается delete-override.
 * 3) Recurring + FUTURE + orderIndex=0:
 *   - серия обновляется in-place;
 *   - override-цепочка очищается с начала.
 * 4) Recurring + FUTURE + orderIndex>0:
 *   - серия делится на head/tail;
 *   - head обрезается, tail создается как новое событие.
 *
 * Гарантии и ограничения:
 * - смена `frequency` у recurring-серии запрещена;
 * - для recurring обязателен валидный `orderIndex`;
 * - при передаче reminders требуется хотя бы один TG-target в пространстве.
 */
@Injectable()
export class UpdateEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(EVENT_OVERRIDE_REPOSITORY)
		private readonly eventOverrideRepository: EventOverrideRepository,

		@Inject(REMINDER_SCHEDULER)
		private readonly reminderScheduler: ReminderScheduler,

		@Inject(REMINDER_PLANNING)
		private readonly reminderPlanningService: ReminderPlanning,

		@Inject(SPACE_TG_CHAT_QUERY)
		private readonly spaceTgChatQuery: SpaceTgChatQuery,

		@Inject(RECURRING_OVERRIDES)
		private readonly recurringOverridesService: RecurringOverrides,

		private readonly updateSingleEventBranchService: UpdateSingleEventBranchService,
		private readonly updateRecurringOneBranchService: UpdateRecurringOneBranchService,
		private readonly updateRecurringFutureHeadBranchService: UpdateRecurringFutureHeadBranchService,
		private readonly updateRecurringFutureSplitBranchService: UpdateRecurringFutureSplitBranchService,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			// 1) Загружаем событие в контексте space и проверяем доступность.
			const event = await this.eventRepository.findByIdWithSpaceId(cmd.eventId, cmd.spaceId);
			if (!event) {
				throw new NotFoundException('Событие не найдено');
			}

			// 2) Блокируем неподдержанный кейс: смена frequency у recurring.
			const isRecurringEvent = event.frequency !== 'NEVER';
			if (isRecurringEvent) {
				const isFrequencyChangeRequested = cmd.frequency !== event.frequency;
				if (isFrequencyChangeRequested) {
					throw new HttpException(
						UNSUPPORTED_FREQUENCY_CHANGE_ERROR,
						HttpStatus.BAD_REQUEST,
					);
				}
			}

			// 3) Проверяем precondition для reminders (если reminders переданы в PATCH).
			await this.ensureReminderTargetsIfNeeded(cmd.spaceId, cmd.reminders);

			// 4) Строим план мутаций по соответствующей ветке доменной логики.
			let mutationPlan: UpdateEventMutationPlan;
			if (isRecurringEvent) {
				mutationPlan = await this.buildRecurringMutationPlan(event, cmd);
			} else {
				mutationPlan = this.updateSingleEventBranchService.execute(event, cmd);
			}

			// 5) Применяем DB-операции и reminder-эффекты в фиксированном порядке.
			await this.applyUpdateOperations(mutationPlan.operations);
			await this.applyUpdateEffects(mutationPlan);
		});
	}

	/**
	 * Строит план мутаций для recurring-событий.
	 *
	 * Развилка:
	 * - `updateType=ONE` -> ветка изменения одного инстанса;
	 * - `updateType=FUTURE` + `orderIndex=0` -> in-place обновление головы;
	 * - `updateType=FUTURE` + `orderIndex>0` -> split серии на head/tail.
	 */
	private async buildRecurringMutationPlan(
		event: Event,
		cmd: Cmd,
	): Promise<UpdateEventMutationPlan> {
		const orderIndex = this.requireRecurringOrderIndex(cmd.orderIndex);
		const overrides = await this.eventOverrideRepository.findByEventId(event.id);

		if (cmd.updateType === 'ONE') {
			const rebasedOverride = this.buildRebasedFutureOverride({
				eventId: event.id,
				orderIndex,
				overrides,
			});
			return this.updateRecurringOneBranchService.execute({
				event,
				cmd,
				orderIndex,
				overrides,
				rebasedOverride,
			});
		}

		const nextRepeatUntil = this.resolveNextRepeatUntilForFuture(event, cmd);
		const occurrence = this.materializeOccurrenceOrThrow(event, overrides, orderIndex);

		if (orderIndex === 0) {
			return this.updateRecurringFutureHeadBranchService.execute({
				event,
				cmd,
				nextRepeatUntil,
			});
		}

		return this.updateRecurringFutureSplitBranchService.execute({
			event,
			cmd,
			orderIndex,
			occurrenceStart: occurrence.start,
			nextRepeatUntil,
		});
	}

	/** Проверяет и возвращает валидный `orderIndex` для recurring-веток. */
	private requireRecurringOrderIndex(orderIndex?: number): number {
		const hasValidOrderIndex =
			typeof orderIndex === 'number' && Number.isInteger(orderIndex) && orderIndex >= 0;
		if (!hasValidOrderIndex) {
			throw new HttpException(
				'orderIndex обязателен для повторяющихся событий',
				HttpStatus.BAD_REQUEST,
			);
		}

		return orderIndex;
	}

	/**
	 * Вычисляет новое значение `repeatUntil` для FUTURE-веток.
	 *
	 * Правила:
	 * - если в PATCH `repeatUntil` не передан, сохраняем текущее значение события;
	 * - если передан, заменяем;
	 * - запрещаем `repeatUntil < start` для recurring.
	 */
	private resolveNextRepeatUntilForFuture(event: Event, cmd: Cmd): DateTime | undefined {
		let nextRepeatUntil = event.repeatUntil;
		const hasRepeatUntilPatch = typeof cmd.repeatUntil !== 'undefined';
		if (hasRepeatUntilPatch && cmd.repeatUntil) {
			nextRepeatUntil = DateTime.fromDate(cmd.repeatUntil);
		}

		const hasRepeatUntil = Boolean(nextRepeatUntil);
		let isRepeatUntilBeforeStart = false;
		if (hasRepeatUntil && nextRepeatUntil) {
			isRepeatUntilBeforeStart = nextRepeatUntil.value.getTime() < cmd.start.getTime();
		}
		if (isRepeatUntilBeforeStart) {
			throw new HttpException(REPEAT_UNTIL_VALIDATION_ERROR, HttpStatus.BAD_REQUEST);
		}

		return nextRepeatUntil;
	}

	/**
	 * Материализует инстанс recurring-серии по `orderIndex` с учетом override-цепочки.
	 *
	 * Нужен в split-сценарии, чтобы корректно обрезать старую серию по фактическому start
	 * инстанса, а не по теоретическому.
	 */
	private materializeOccurrenceOrThrow(
		event: Event,
		overrides: EventOverride[],
		orderIndex: number,
	): {
		start: Date;
		isDeleted: boolean;
	} {
		const occurrence = materializeEventOrder({
			event,
			overrides,
			orderIndex,
		});

		if (!occurrence) {
			throw new HttpException(
				'Некорректный orderIndex для разделения серии',
				HttpStatus.BAD_REQUEST,
			);
		}

		return occurrence;
	}

	/**
	 * Рассчитывает rebase FUTURE-anchor при замене текущего order в сценарии `ONE`.
	 *
	 * Если текущий override не является FUTURE-anchor, возвращает `null`.
	 */
	private buildRebasedFutureOverride(params: {
		eventId: string;
		orderIndex: number;
		overrides: EventOverride[];
	}): EventOverride | null {
		const { eventId, orderIndex, overrides } = params;
		const currentOverride = overrides.find((override) => override.orderIndex === orderIndex);
		const isFutureAnchorBeingReplaced = this.isFutureAnchorOverride(currentOverride);
		if (!isFutureAnchorBeingReplaced || !currentOverride) {
			return null;
		}

		return this.recurringOverridesService.buildFutureAnchorAfterRemoval({
			eventId,
			removedOrderIndex: orderIndex,
			futureShift: currentOverride.offset,
			overrides,
		});
	}

	/**
	 * Применяет DB-часть плана обновления.
	 *
	 * Порядок важен и задается planner-ом:
	 * - use-case не сортирует операции, а исполняет их последовательно как есть.
	 */
	private async applyUpdateOperations(operations: UpdateEventMutationOperation[]): Promise<void> {
		for (const operation of operations) {
			switch (operation.type) {
				case 'event.update':
					await this.eventRepository.update(operation.event);
					break;
				case 'override.deleteAfter':
					await this.eventOverrideRepository.deleteAfterOrder(
						operation.eventId,
						operation.orderIndex,
					);
					break;
				case 'event.create':
					await this.eventRepository.create(operation.event);
					break;
				case 'override.upsert':
					await this.eventOverrideRepository.upsert(operation.override);
					break;
				default:
					break;
			}
		}
	}

	/**
	 * Применяет reminder-эффекты после DB-модификаций.
	 *
	 * Порядок:
	 * 1) unschedule удаленных reminders;
	 * 2) replan затронутых событий.
	 *
	 * Перед выполнением ids дедуплицируются.
	 */
	private async applyUpdateEffects(plan: UpdateEventMutationPlan): Promise<void> {
		const uniqueReminderIds = this.dedupeIds(plan.unscheduleReminderIds);
		const uniqueEventIds = this.dedupeIds(plan.replanEventIds);

		for (const reminderId of uniqueReminderIds) {
			await this.reminderScheduler.unschedule(reminderId);
		}

		for (const eventId of uniqueEventIds) {
			await this.reminderPlanningService.replanEvent(eventId);
		}
	}

	/**
	 * Проверяет precondition для PATCH reminders:
	 * - если reminders не переданы или пусты -> проверка не нужна;
	 * - если reminders переданы непустым массивом -> в space должен быть TG-target.
	 */
	private async ensureReminderTargetsIfNeeded(
		spaceId: string,
		reminders?: UpdateEventReminderInput[],
	): Promise<void> {
		const hasReminderPayload = Boolean(reminders?.length);
		if (!hasReminderPayload) {
			return;
		}

		const activeTargets = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(spaceId);
		const hasNoTargets = activeTargets.length === 0;
		if (hasNoTargets) {
			throw new HttpException(REMINDER_TARGETS_REQUIRED_ERROR, HttpStatus.BAD_REQUEST);
		}
	}

	/** Удаляет дубликаты, сохраняя исходный порядок первого появления id. */
	private dedupeIds(ids: string[]): string[] {
		const uniqueIds = new Set<string>();
		const dedupedIds: string[] = [];

		for (const id of ids) {
			if (uniqueIds.has(id)) {
				continue;
			}

			uniqueIds.add(id);
			dedupedIds.push(id);
		}

		return dedupedIds;
	}

	/** Определяет, что override является FUTURE-anchor (не ONE и не delete). */
	private isFutureAnchorOverride(override?: EventOverride): override is EventOverride {
		if (!override) {
			return false;
		}

		const isOneTimeOffset = override.isOffsetOnce;
		const isDeleted = override.isDeleted;
		return !isOneTimeOffset && !isDeleted;
	}
}
