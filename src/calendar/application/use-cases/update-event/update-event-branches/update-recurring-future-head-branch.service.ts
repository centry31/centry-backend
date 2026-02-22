import type { Event } from 'calendar/domain/event.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { UpdateEventBranchCmd, UpdateEventMutationPlan } from './update-event-branch.types';
import { UpdateEventReminderToolsService } from './update-event-reminder-tools.service';

import { Injectable } from '@nestjs/common';

@Injectable()
export class UpdateRecurringFutureHeadBranchService {
	constructor(private readonly reminderTools: UpdateEventReminderToolsService) {}

	/**
	 * Сценарий `recurring + FUTURE + orderIndex=0` (head-update):
	 * изменение всей серии "с головы", то есть начиная с первого инстанса.
	 *
	 * Поведение ветки:
	 * - серия обновляется in-place (title/description/start/duration/repeatUntil);
	 * - вся цепочка override очищается через `override.deleteAfter(event.id, -1)`,
	 *   чтобы после апдейта серия начиналась с чистой истории переопределений.
	 *
	 * Семантика reminders у текущей серии:
	 * - `cmd.reminders === undefined` -> reminders остаются как есть;
	 * - `cmd.reminders === []` -> reminders очищаются;
	 * - `cmd.reminders.length > 0` -> reminders полностью заменяются.
	 *
	 * Результат:
	 * - операции: `event.update` + `override.deleteAfter(-1)`;
	 * - `replanEventIds = [event.id]`;
	 * - `unscheduleReminderIds` содержит удаленные reminders после diff.
	 *
	 * Метод pure относительно I/O:
	 * - не пишет в БД;
	 * - не трогает очередь;
	 * - возвращает только план.
	 */
	execute(params: {
		event: Event;
		cmd: UpdateEventBranchCmd;
		nextRepeatUntil?: DateTime;
	}): UpdateEventMutationPlan {
		const { event, cmd, nextRepeatUntil } = params;
		const previousReminderIds = event.reminders.map((reminder) => reminder.id);

		event.changeTitle(cmd.title);
		event.changeDescription(cmd.description);
		event.changeTimeRange(DateTime.fromDate(cmd.start), cmd.duration);
		event.changeRepeatUntil(nextRepeatUntil);

		const hasRemindersPatch = typeof cmd.reminders !== 'undefined';
		if (hasRemindersPatch && cmd.reminders) {
			this.reminderTools.replaceEventReminders(event, cmd.reminders);
		}

		const removedReminderIds = this.reminderTools.collectRemovedReminderIds(
			previousReminderIds,
			event.reminders,
		);

		return {
			operations: [
				{ type: 'event.update', event },
				{ type: 'override.deleteAfter', eventId: event.id, orderIndex: -1 },
			],
			replanEventIds: [event.id],
			unscheduleReminderIds: removedReminderIds,
		};
	}
}
