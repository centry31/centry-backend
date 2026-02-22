/**
 * Контракт планирования в очереди, используемый reminder-планировщиком.
 */
export type ReminderScheduleEvent = {
	reminderId: string;
	/**
	 * Слот инстанса, для которого запланирована текущая job.
	 */
	plannedOccurrenceStartAt: Date;
	/**
	 * Абсолютный момент выполнения напоминания.
	 */
	scheduledAt: Date;
};

/**
 * Абстракция адаптера очереди.
 */
export interface ReminderScheduler {
	/**
	 * Планирует (или заменяет) reminder job в очереди.
	 */
	schedule(cmd: ReminderScheduleEvent): Promise<void>;
	/**
	 * Удаляет reminder jobs из очереди.
	 */
	unschedule(reminderId: string): Promise<void>;
}

export const REMINDER_SCHEDULER = Symbol('REMINDER_SCHEDULER');
