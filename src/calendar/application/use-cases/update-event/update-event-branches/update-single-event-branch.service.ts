import type { Event } from 'calendar/domain/event.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { UpdateEventBranchCmd, UpdateEventMutationPlan } from './update-event-branch.types';
import { UpdateEventReminderToolsService } from './update-event-reminder-tools.service';

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const REPEAT_UNTIL_VALIDATION_ERROR =
	'repeatUntil должен быть не раньше start для повторяющихся событий';

@Injectable()
export class UpdateSingleEventBranchService {
	constructor(private readonly reminderTools: UpdateEventReminderToolsService) {}

	/**
	 * Сценарий `single`:
	 * обновление события, у которого текущая серия не повторяется (`frequency=NEVER`).
	 *
	 * Что валидируется:
	 * - `orderIndex` допускается только `undefined` или `0`;
	 * - при переводе в recurring-частоту `repeatUntil` не может быть раньше `start`.
	 *
	 * Как применяется patch:
	 * - заголовок, описание, время и длительность перезаписываются всегда;
	 * - `frequency` берется из команды;
	 * - `repeatUntil`:
	 *   - для `NEVER` принудительно очищается;
	 *   - для recurring берется из `cmd.repeatUntil`, если передан.
	 *
	 * Семантика reminders:
	 * - `cmd.reminders === undefined` -> reminders не меняются;
	 * - `cmd.reminders === []` -> reminders очищаются;
	 * - `cmd.reminders.length > 0` -> reminders полностью заменяются.
	 *
	 * Результат:
	 * - одна DB-операция `event.update`;
	 * - `replanEventIds = [event.id]`;
	 * - `unscheduleReminderIds` содержит только удаленные reminders (diff старого и нового наборов).
	 *
	 * Метод pure относительно I/O:
	 * - не пишет в БД;
	 * - не трогает очередь;
	 * - возвращает только план.
	 */
	execute(event: Event, cmd: UpdateEventBranchCmd): UpdateEventMutationPlan {
		const hasExplicitOrderIndex = typeof cmd.orderIndex !== 'undefined';
		const hasInvalidOrderIndexForSingle = hasExplicitOrderIndex && cmd.orderIndex !== 0;
		if (hasInvalidOrderIndexForSingle) {
			throw new HttpException(
				'Для одноразового события orderIndex может быть только 0',
				HttpStatus.BAD_REQUEST,
			);
		}

		const previousReminderIds = event.reminders.map((reminder) => reminder.id);
		const startVo = DateTime.fromDate(cmd.start);

		event.changeTitle(cmd.title);
		event.changeDescription(cmd.description);
		event.changeTimeRange(startVo, cmd.duration);
		event.changeFrequency(cmd.frequency);

		const isRecurringFrequency = cmd.frequency !== 'NEVER';
		const hasRepeatUntilDate = Boolean(cmd.repeatUntil);
		let isRepeatUntilBeforeStart = false;
		if (hasRepeatUntilDate && cmd.repeatUntil) {
			isRepeatUntilBeforeStart = cmd.repeatUntil.getTime() < cmd.start.getTime();
		}

		const hasInvalidRepeatUntil = isRecurringFrequency && isRepeatUntilBeforeStart;
		if (hasInvalidRepeatUntil) {
			throw new HttpException(REPEAT_UNTIL_VALIDATION_ERROR, HttpStatus.BAD_REQUEST);
		}

		let nextRepeatUntil: DateTime | undefined;
		const isNeverFrequency = cmd.frequency === 'NEVER';
		if (!isNeverFrequency && cmd.repeatUntil) {
			nextRepeatUntil = DateTime.fromDate(cmd.repeatUntil);
		}
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
			operations: [{ type: 'event.update', event }],
			replanEventIds: [event.id],
			unscheduleReminderIds: removedReminderIds,
		};
	}
}
