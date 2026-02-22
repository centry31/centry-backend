import type { Event } from 'calendar/domain/event.entity';
import type { EventOverride } from 'calendar/domain/event-override.entity';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	EVENT_OVERRIDE_REPOSITORY,
	EventOverrideRepository,
} from 'calendar/application/ports/event-override/event-override.repository';
import {
	type ReminderPlanning,
	type ReplanReminderParams,
} from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { Inject, Injectable, Logger } from '@nestjs/common';
import {
	findNextReminderOccurrence,
	type NextReminderOccurrence,
} from 'calendar/application/services/reminder-planning/find-next-reminder-occurrence';

/**
 * Поддерживает скользящее планирование напоминаний.
 *
 * Для каждого напоминания хранит только ближайший будущий инстанс в БД и очереди.
 */
@Injectable()
export class ReminderPlanningService implements ReminderPlanning {
	private readonly logger = new Logger(ReminderPlanningService.name);

	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(EVENT_OVERRIDE_REPOSITORY)
		private readonly eventOverrideRepository: EventOverrideRepository,

		@Inject(REMINDER_SCHEDULER)
		private readonly reminderScheduler: ReminderScheduler,
	) {}

	/** Пустое состояние планирования, когда будущих инстансов больше нет. */
	private readonly emptyPlanningState = {
		nextOrderIndex: null,
		nextOccurrenceStart: null,
		scheduledAt: null,
	};

	/**
	 * Перестраивает планирование для всех напоминаний события.
	 *
	 * @param eventId Идентификатор события.
	 * @param now Текущее время планирования (по умолчанию системное).
	 */
	async replanEvent(eventId: string, now: Date = new Date()): Promise<void> {
		// 1) Загружаем событие и проверяем, что оно существует.
		const event = await this.eventRepository.findById(eventId);
		if (!event) {
			this.logger.warn(`Пропуск перепланирования event=${eventId}: событие не найдено`);
			return;
		}

		// 2) Загружаем переопределения (для NEVER они не нужны).
		const overrides = await this.getOverrides(event);

		// 3) Перепланируем каждое напоминание независимо.
		for (const reminder of event.reminders) {
			await this.replanOne({
				event,
				overrides,
				reminderId: reminder.id,
				offsetMinutes: reminder.offsetMinutes,
				now,
				startOrderHint: 0,
			});
		}
	}

	/**
	 * Перестраивает планирование для одного напоминания и ставит следующий job.
	 *
	 * @param reminderId Идентификатор напоминания.
	 * @param params Дополнительные параметры планирования.
	 */
	async replanReminder(reminderId: string, params: ReplanReminderParams = {}): Promise<void> {
		// 1) Берем состояние планирования напоминания из БД.
		const reminderState = await this.eventRepository.findReminderPlanningState(reminderId);
		if (!reminderState) {
			await this.reminderScheduler.unschedule(reminderId);
			this.logger.warn(
				`Пропуск перепланирования reminder=${reminderId}: напоминание не найдено`,
			);
			return;
		}

		// 2) Загружаем событие-владелец напоминания.
		const event = await this.eventRepository.findById(reminderState.eventId);
		if (!event) {
			await this.reminderScheduler.unschedule(reminderId);
			this.logger.warn(
				`Пропуск перепланирования reminder=${reminderId}: event=${reminderState.eventId} не найден`,
			);
			return;
		}

		const reminder = event.reminders.find(
			(currentReminder) => currentReminder.id === reminderId,
		);
		if (!reminder) {
			await this.eventRepository.updateReminderPlanningState(
				reminderId,
				this.emptyPlanningState,
			);
			await this.reminderScheduler.unschedule(reminderId);
			this.logger.warn(
				`Пропуск перепланирования reminder=${reminderId}: reminder отсутствует в event=${event.id}`,
			);
			return;
		}

		// 3) Пересчитываем и сохраняем следующий инстанс напоминания.
		const overrides = await this.getOverrides(event);

		await this.replanOne({
			event,
			overrides,
			reminderId,
			offsetMinutes: reminder.offsetMinutes,
			now: params.now ?? new Date(),
			startOrderHint: params.startOrderHint ?? 0,
		});
	}

	/**
	 * Считает и сохраняет ближайший инстанс напоминания, затем обновляет job в очереди.
	 * Если будущих инстансов нет — очищает состояние планирования.
	 */
	private async replanOne(params: {
		event: Event;
		overrides: EventOverride[];
		reminderId: string;
		offsetMinutes: number;
		now: Date;
		startOrderHint: number;
	}): Promise<void> {
		const { event, overrides, reminderId, offsetMinutes, now, startOrderHint } = params;

		let nextOccurrence: NextReminderOccurrence | null = null;
		try {
			nextOccurrence = findNextReminderOccurrence({
				event,
				overrides,
				offsetMinutes,
				now,
				startOrderHint,
			});
		} catch (error) {
			this.logger.error(
				`Ошибка вычисления следующего инстанса reminder=${reminderId} event=${event.id}`,
				error instanceof Error ? error.stack : undefined,
			);
			throw error;
		}

		if (!nextOccurrence) {
			// Серия завершилась или все будущие инстансы уже просрочены.
			await this.eventRepository.updateReminderPlanningState(
				reminderId,
				this.emptyPlanningState,
			);
			await this.reminderScheduler.unschedule(reminderId);
			this.logger.log(
				`reminder_replanned reminderId=${reminderId} eventId=${event.id} nextOrderIndex=null scheduledAt=null reason=нет_будущих_инстансов`,
			);
			return;
		}

		// 1) Сохраняем новое состояние планирования.
		await this.eventRepository.updateReminderPlanningState(reminderId, {
			nextOrderIndex: nextOccurrence.orderIndex,
			nextOccurrenceStart: nextOccurrence.occurrenceStart,
			scheduledAt: nextOccurrence.scheduledAt,
		});
		// 2) Атомарно через remove+add обеспечиваем единственный актуальный job.
		await this.reminderScheduler.unschedule(reminderId);
		await this.reminderScheduler.schedule({
			reminderId,
			plannedOrderIndex: nextOccurrence.orderIndex,
			plannedOccurrenceStartAt: nextOccurrence.occurrenceStart,
			scheduledAt: nextOccurrence.scheduledAt,
		});

		this.logger.log(
			`reminder_replanned reminderId=${reminderId} eventId=${event.id} nextOrderIndex=${
				nextOccurrence.orderIndex
			} scheduledAt=${nextOccurrence.scheduledAt.toISOString()}`,
		);
	}

	/** Загружает override-ы только для повторяющихся событий. */
	private async getOverrides(event: Event): Promise<EventOverride[]> {
		if (event.frequency === 'NEVER') {
			return [];
		}

		return this.eventOverrideRepository.findByEventId(event.id);
	}
}
