import type { Event } from 'calendar/domain/event.entity';
import type { EventException } from 'calendar/domain/event-exception.entity';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	EVENT_EXCEPTION_REPOSITORY,
	EventExceptionRepository,
} from 'calendar/application/ports/event-exception/event-exception.repository';
import {
	type ReminderPlanning,
	type ReplanReminderParams,
} from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { RecurrenceService } from 'calendar/application/services/recurrence/recurrence.service';
import {
	findNextReminderOccurrence,
	type NextReminderOccurrence,
} from 'calendar/application/services/reminder-planning/find-next-reminder-occurrence';

/**
 * Оркестратор планирования напоминаний.
 *
 * Держит persist-состояние (`nextOccurrenceStart`, `scheduledAt`)
 * в согласованном виде с актуальными event/exception данными.
 */
@Injectable()
export class ReminderPlanningService implements ReminderPlanning {
	private readonly logger = new Logger(ReminderPlanningService.name);

	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(EVENT_EXCEPTION_REPOSITORY)
		private readonly eventExceptionRepository: EventExceptionRepository,

		@Inject(REMINDER_SCHEDULER)
		private readonly reminderScheduler: ReminderScheduler,

		private readonly recurrenceService: RecurrenceService,
	) {}

	/**
	 * Переиспользуемое состояние "плана нет".
	 */
	private readonly emptyPlanningState = {
		nextOccurrenceStart: null,
		scheduledAt: null,
	};

	/**
	 * Перепланирует все reminders конкретного события.
	 */
	async replanEvent(eventId: string, now: Date = new Date()): Promise<void> {
		const event = await this.eventRepository.findById(eventId);
		if (!event) {
			this.logger.warn(`Пропуск перепланирования event=${eventId}: событие не найдено`);
			return;
		}

		const exceptions = await this.getExceptions(event);
		for (const reminder of event.reminders) {
			await this.replanOne({
				event,
				exceptions,
				reminderId: reminder.id,
				offsetMinutes: reminder.offsetMinutes,
				now,
			});
		}
	}

	/**
	 * Перепланирует один reminder по `reminderId`.
	 *
	 * Используется процессором очереди после отправки/пропуска и в сценариях изменений.
	 */
	async replanReminder(reminderId: string, params: ReplanReminderParams = {}): Promise<void> {
		const reminderState = await this.eventRepository.findReminderPlanningState(reminderId);
		if (!reminderState) {
			await this.reminderScheduler.unschedule(reminderId);
			this.logger.warn(
				`Пропуск перепланирования reminder=${reminderId}: напоминание не найдено`,
			);
			return;
		}

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

		const exceptions = await this.getExceptions(event);
		await this.replanOne({
			event,
			exceptions,
			reminderId,
			offsetMinutes: reminder.offsetMinutes,
			now: params.now ?? new Date(),
			startOccurrenceHint: params.startOccurrenceHint,
		});
	}

	/**
	 * Считает и сохраняет следующий план для одного reminder.
	 *
	 * Затем синхронизирует очередь:
	 * - удаляет устаревшие jobs;
	 * - ставит новую job, если есть будущий инстанс.
	 */
	private async replanOne(params: {
		event: Event;
		exceptions: EventException[];
		reminderId: string;
		offsetMinutes: number;
		now: Date;
		startOccurrenceHint?: Date;
	}): Promise<void> {
		const { event, exceptions, reminderId, offsetMinutes, now, startOccurrenceHint } = params;

		let nextOccurrence: NextReminderOccurrence | null = null;
		try {
			nextOccurrence = findNextReminderOccurrence({
				event,
				exceptions,
				offsetMinutes,
				now,
				startOccurrenceHint,
				recurrenceService: this.recurrenceService,
			});
		} catch (error) {
			this.logger.error(
				`Ошибка вычисления следующего инстанса reminder=${reminderId} event=${event.id}`,
				error instanceof Error ? error.stack : undefined,
			);
			throw error;
		}

		if (!nextOccurrence) {
			await this.eventRepository.updateReminderPlanningState(
				reminderId,
				this.emptyPlanningState,
			);
			await this.reminderScheduler.unschedule(reminderId);
			this.logger.log(
				`reminder_replanned reminderId=${reminderId} eventId=${event.id} nextOccurrenceStart=null scheduledAt=null reason=нет_будущих_инстансов`,
			);
			return;
		}

		await this.eventRepository.updateReminderPlanningState(reminderId, {
			nextOccurrenceStart: nextOccurrence.occurrenceStart,
			scheduledAt: nextOccurrence.scheduledAt,
		});
		await this.reminderScheduler.unschedule(reminderId);
		await this.reminderScheduler.schedule({
			reminderId,
			plannedOccurrenceStartAt: nextOccurrence.occurrenceStart,
			scheduledAt: nextOccurrence.scheduledAt,
		});

		this.logger.log(
			`reminder_replanned reminderId=${reminderId} eventId=${
				event.id
			} nextOccurrenceStart=${nextOccurrence.occurrenceStart.toISOString()} scheduledAt=${nextOccurrence.scheduledAt.toISOString()}`,
		);
	}

	/**
	 * Загружает исключения только для повторяющихся событий.
	 */
	private async getExceptions(event: Event): Promise<EventException[]> {
		if (!event.isRecurring()) {
			return [];
		}

		return this.eventExceptionRepository.findByEventId(event.id);
	}
}
