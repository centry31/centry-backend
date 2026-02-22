/**
 * Дополнительные подсказки для перепланирования reminder.
 */
export type ReplanReminderParams = {
	/**
	 * Нижняя граница поиска следующего инстанса.
	 */
	startOccurrenceHint?: Date;
	/**
	 * Явное значение "now" для детерминированных тестов.
	 */
	now?: Date;
};

/**
 * Контракт application-сервиса оркестрации планов reminders.
 */
export interface ReminderPlanning {
	/**
	 * Перепланирует все reminders, привязанные к событию.
	 */
	replanEvent(eventId: string, now?: Date): Promise<void>;
	/**
	 * Перепланирует один reminder по id.
	 */
	replanReminder(reminderId: string, params?: ReplanReminderParams): Promise<void>;
}

export const REMINDER_PLANNING = Symbol('REMINDER_PLANNING');
