import {
	EVENT_REPOSITORY,
	EventRepository,
	type ReminderPlanningState,
} from 'calendar/application/ports/event/event.repository';
import {
	REMINDER_PLANNING,
	ReminderPlanning,
} from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import { TG_NOTIFIER, TgNotifier } from 'calendar/application/ports/tg-notifier/tg-notifier.port';

import type { ReminderJobData } from './bull-reminder.scheduler';
import { REMINDER_JOB_NAME, REMINDER_QUEUE_NAME } from './reminder-queue.constants';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

@Processor(REMINDER_QUEUE_NAME)
export class ReminderProcessor extends WorkerHost {
	private readonly logger = new Logger(ReminderProcessor.name);

	constructor(
		@Inject(TG_NOTIFIER)
		private readonly notifier: TgNotifier,

		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(SPACE_TG_CHAT_QUERY)
		private readonly spaceTgChatQuery: SpaceTgChatQuery,

		@Inject(REMINDER_PLANNING)
		private readonly reminderPlanningService: ReminderPlanning,
	) {
		super();
	}

	async process(job: Job<ReminderJobData>): Promise<void> {
		const isForeignJobType = job.name !== REMINDER_JOB_NAME;
		if (isForeignJobType) {
			return;
		}

		// 1) Загружаем актуальное состояние планирования напоминания из БД.
		const { reminderId, plannedOrderIndex, plannedOccurrenceStartAtIso } = job.data;
		const reminderState = await this.eventRepository.findReminderPlanningState(reminderId);

		if (!this.hasActivePlanningState(reminderState)) {
			this.logger.warn(
				`Пропуск задачи напоминания ${job.id}: reminder=${reminderId} не имеет активного состояния планирования`,
			);
			return;
		}

		// 2) Проверяем, что job не протух: payload должен совпадать с состоянием планирования.
		const actualOccurrenceStartIso = reminderState.nextOccurrenceStart.toISOString();
		const hasDifferentOrderIndex = reminderState.nextOrderIndex !== plannedOrderIndex;
		const hasDifferentOccurrenceStart =
			actualOccurrenceStartIso !== plannedOccurrenceStartAtIso;
		const isStaleJob = hasDifferentOrderIndex || hasDifferentOccurrenceStart;
		if (isStaleJob) {
			this.logger.warn(
				`Пропуск устаревшей задачи напоминания ${job.id}: reminder=${reminderId} plannedOrderIndex=${plannedOrderIndex} actualOrderIndex=${reminderState.nextOrderIndex}`,
			);
			return;
		}

		// 3) Берем актуальные TG-цели на момент исполнения.
		const targets = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(
			reminderState.spaceId,
		);
		if (targets.length === 0) {
			this.logger.warn(
				`Нет активных TG-целей для reminder=${reminderId} event=${reminderState.eventId}; отправка пропущена, переходим к следующему инстансу`,
			);
			await this.reminderPlanningService.replanReminder(reminderId, {
				startOrderHint: plannedOrderIndex + 1,
			});
			return;
		}

		// 4) Отправляем уведомление всем найденным целям.
		const text = this.buildReminderText(
			reminderState.eventTitle,
			plannedOccurrenceStartAtIso,
			reminderState.offsetMinutes,
		);

		for (const target of targets) {
			await this.notifier.send({
				chatId: target.chatId,
				messageThreadId: target.messageThreadId,
				text,
			});
		}

		// 5) Фиксируем успешную отправку и планируем следующий инстанс.
		await this.eventRepository.markReminderSent(reminderId);
		await this.reminderPlanningService.replanReminder(reminderId, {
			startOrderHint: plannedOrderIndex + 1,
		});
		this.logger.log(
			`reminder_processed reminderId=${reminderId} orderIndex=${plannedOrderIndex} occurrence=${plannedOccurrenceStartAtIso}`,
		);
	}

	private buildReminderText(
		title: string,
		eventStartAtIso: string,
		offsetMinutes: number,
	): string {
		const startAt = new Date(eventStartAtIso);
		const startText = Number.isNaN(startAt.getTime())
			? eventStartAtIso
			: startAt.toLocaleString('ru-RU');

		return `Напоминание: ${title}\nНачало: ${startText}\nЗа ${offsetMinutes} мин.`;
	}

	private hasActivePlanningState(
		reminderState: ReminderPlanningState | null,
	): reminderState is ReminderPlanningState & {
		nextOrderIndex: number;
		nextOccurrenceStart: Date;
	} {
		// Проверяем, что напоминание существует и в нем действительно есть активный план.
		const isReminderStateMissing = !reminderState;
		const hasNoPlannedOrder = reminderState?.nextOrderIndex === null;
		const hasNoPlannedOccurrence = !reminderState?.nextOccurrenceStart;
		const hasNoActivePlanningState =
			isReminderStateMissing || hasNoPlannedOrder || hasNoPlannedOccurrence;
		return !hasNoActivePlanningState;
	}
}
