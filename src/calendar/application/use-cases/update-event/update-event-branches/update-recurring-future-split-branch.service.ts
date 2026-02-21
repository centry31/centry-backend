import * as crypto from 'crypto';

import { Event } from 'calendar/domain/event.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { UpdateEventBranchCmd, UpdateEventMutationPlan } from './update-event-branch.types';
import { UpdateEventReminderToolsService } from './update-event-reminder-tools.service';

import { Injectable } from '@nestjs/common';

@Injectable()
export class UpdateRecurringFutureSplitBranchService {
	constructor(private readonly reminderTools: UpdateEventReminderToolsService) {}

	/**
	 * Сценарий `recurring + FUTURE + orderIndex>0` (split):
	 * изменить хвост серии, начиная не с первого инстанса.
	 *
	 * Поведение ветки:
	 * - исходная серия обрезается до инстанса `orderIndex - 1`
	 *   (`repeatUntil = occurrenceStart - 1ms`);
	 * - override-хвост старой серии удаляется через `override.deleteAfter(orderIndex - 1)`;
	 * - создается новая tail-серия от `cmd.start` с теми же владельцем/пространством/частотой.
	 *
	 * Семантика reminders у новой tail-серии:
	 * - `cmd.reminders === undefined` -> копируются reminders исходной серии;
	 * - `cmd.reminders === []` -> tail-серия создается без reminders;
	 * - `cmd.reminders.length > 0` -> tail-серия получает reminders из patch.
	 *
	 * Результат:
	 * - операции: `event.update` (head) -> `override.deleteAfter` -> `event.create` (tail);
	 * - `replanEventIds` содержит обе серии (head и tail);
	 * - `unscheduleReminderIds` пустой, потому что явного удаления reminders у старой серии нет.
	 *
	 * Метод pure относительно I/O:
	 * - не пишет в БД;
	 * - не трогает очередь;
	 * - возвращает только план.
	 */
	execute(params: {
		event: Event;
		cmd: UpdateEventBranchCmd;
		orderIndex: number;
		occurrenceStart: Date;
		nextRepeatUntil?: DateTime;
	}): UpdateEventMutationPlan {
		const { event, cmd, orderIndex, occurrenceStart, nextRepeatUntil } = params;

		// 1) Обрезаем старую серию до редактируемого инстанса (не включая его).
		const prevSeriesRepeatUntil = new Date(occurrenceStart.getTime() - 1);
		event.changeRepeatUntil(DateTime.fromDate(prevSeriesRepeatUntil));

		// 2) Создаем новую серию от редактируемого инстанса.
		const nowVo = DateTime.now();
		const splitFutureEventId = crypto.randomUUID();
		const splitFutureEvent = new Event({
			id: splitFutureEventId,
			title: cmd.title,
			description: cmd.description ?? undefined,
			start: DateTime.fromDate(cmd.start),
			repeatUntil: nextRepeatUntil,
			duration: cmd.duration,
			spaceId: event.spaceId,
			createdById: event.createdById,
			createdAt: nowVo,
			frequency: event.frequency,
			reminders: this.reminderTools.resolveNewEventReminders({
				eventId: splitFutureEventId,
				fallbackReminders: event.reminders,
				remindersPatch: cmd.reminders,
				createdAt: nowVo,
			}),
		});

		return {
			operations: [
				{ type: 'event.update', event },
				{ type: 'override.deleteAfter', eventId: event.id, orderIndex: orderIndex - 1 },
				{ type: 'event.create', event: splitFutureEvent },
			],
			replanEventIds: [event.id, splitFutureEvent.id],
			unscheduleReminderIds: [],
		};
	}
}
