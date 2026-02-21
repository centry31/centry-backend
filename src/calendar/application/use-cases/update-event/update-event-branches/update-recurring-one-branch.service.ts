import * as crypto from 'crypto';

import { Event } from 'calendar/domain/event.entity';
import { EventOverride } from 'calendar/domain/event-override.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { UpdateEventBranchCmd, UpdateEventMutationPlan } from './update-event-branch.types';
import { UpdateEventReminderToolsService } from './update-event-reminder-tools.service';

import { Injectable } from '@nestjs/common';

@Injectable()
export class UpdateRecurringOneBranchService {
	constructor(private readonly reminderTools: UpdateEventReminderToolsService) {}

	/**
	 * Сценарий `recurring + ONE`:
	 * изменить только один конкретный инстанс серии (`orderIndex`), не затрагивая остальной хвост.
	 *
	 * Поведение ветки:
	 * - в исходной серии выбранный инстанс помечается delete-override
	 *   (`isDeleted=true`, `isOffsetOnce=true`);
	 * - создается detached-событие с `frequency=NEVER` и новыми параметрами из `cmd`;
	 * - при удалении FUTURE-anchor use-case может передать `rebasedOverride`,
	 *   который добавляется первым, чтобы сохранить сдвиг хвоста.
	 *
	 * Семантика reminders для detached-события:
	 * - `cmd.reminders === undefined` -> копируются reminders исходной серии;
	 * - `cmd.reminders === []` -> detached создается без reminders;
	 * - `cmd.reminders.length > 0` -> detached получает новый набор reminders из patch.
	 *
	 * Результат:
	 * - последовательность операций:
	 *   1) optional `override.upsert` (rebased FUTURE anchor),
	 *   2) `event.create` detached NEVER-события,
	 *   3) `override.upsert` delete-override для исходной серии;
	 * - `replanEventIds` содержит исходную серию и detached;
	 * - `unscheduleReminderIds` пустой, потому что удаление jobs выполняется при replan.
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
		overrides: EventOverride[];
		rebasedOverride: EventOverride | null;
	}): UpdateEventMutationPlan {
		const { event, cmd, orderIndex, overrides, rebasedOverride } = params;
		const currentOverride = overrides.find((override) => override.orderIndex === orderIndex);

		const operations: UpdateEventMutationPlan['operations'] = [];
		if (rebasedOverride) {
			operations.push({ type: 'override.upsert', override: rebasedOverride });
		}

		const nowVo = DateTime.now();
		const detachedEventId = crypto.randomUUID();
		const detachedSingleEvent = new Event({
			id: detachedEventId,
			title: cmd.title,
			description: cmd.description ?? undefined,
			start: DateTime.fromDate(cmd.start),
			duration: cmd.duration,
			spaceId: event.spaceId,
			createdById: event.createdById,
			createdAt: nowVo,
			frequency: 'NEVER',
			reminders: this.reminderTools.resolveNewEventReminders({
				eventId: detachedEventId,
				fallbackReminders: event.reminders,
				remindersPatch: cmd.reminders,
				createdAt: nowVo,
			}),
		});
		operations.push({ type: 'event.create', event: detachedSingleEvent });

		const deleteOverride = new EventOverride({
			id: currentOverride?.id ?? crypto.randomUUID(),
			eventId: event.id,
			orderIndex,
			offset: 0,
			isDeleted: true,
			isOffsetOnce: true,
		});
		operations.push({ type: 'override.upsert', override: deleteOverride });

		return {
			operations,
			replanEventIds: [event.id, detachedSingleEvent.id],
			unscheduleReminderIds: [],
		};
	}
}
