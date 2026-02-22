import * as crypto from 'crypto';

import type { Event } from 'calendar/domain/event.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { UpdateEventReminderInput } from './update-event-branch.types';

import { Injectable } from '@nestjs/common';

@Injectable()
export class UpdateEventReminderToolsService {
	/**
	 * Полностью заменяет reminders у существующего события.
	 */
	replaceEventReminders(event: Event, reminders: UpdateEventReminderInput[]): void {
		const createdAtVo = DateTime.now();
		event.clearReminders();

		for (const reminder of reminders) {
			event.addReminder(
				new EventReminder({
					id: crypto.randomUUID(),
					eventId: event.id,
					offsetMinutes: reminder.offsetMinutes,
					createdAt: createdAtVo,
					updatedAt: createdAtVo,
				}),
			);
		}
	}

	/**
	 * Формирует reminders для нового события: из patch, либо копией fallback-списка.
	 */
	resolveNewEventReminders(params: {
		eventId: string;
		fallbackReminders: readonly EventReminder[];
		remindersPatch?: UpdateEventReminderInput[];
		createdAt: DateTime;
	}): EventReminder[] {
		const { eventId, fallbackReminders, remindersPatch, createdAt } = params;
		const hasRemindersPatch = typeof remindersPatch !== 'undefined';

		if (hasRemindersPatch && remindersPatch) {
			return remindersPatch.map(
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

		return fallbackReminders.map(
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
	 * Возвращает id reminders, которые были в старом состоянии и отсутствуют в новом.
	 */
	collectRemovedReminderIds(
		previousReminderIds: string[],
		currentReminders: readonly EventReminder[],
	): string[] {
		const currentReminderIds = new Set(currentReminders.map((reminder) => reminder.id));
		const removedReminderIds: string[] = [];

		for (const reminderId of previousReminderIds) {
			const hasCurrentReminder = currentReminderIds.has(reminderId);
			if (hasCurrentReminder) {
				continue;
			}

			removedReminderIds.push(reminderId);
		}

		return removedReminderIds;
	}
}
