import * as crypto from 'crypto';

import { EventOverride } from 'calendar/domain/event-override.entity';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	EVENT_OVERRIDE_REPOSITORY,
	EventOverrideRepository,
} from 'calendar/application/ports/event-override/event-override.repository';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
	eventId: string;
	orderIndex?: number;
};

const MAX_OVERRIDE_REBASE_STEPS = 10_000;

export class DeleteEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepository,
		@Inject(EVENT_OVERRIDE_REPOSITORY)
		private readonly eventOverrideRepository: EventOverrideRepository,
		@Inject(REMINDER_SCHEDULER) private readonly reminderScheduler: ReminderScheduler,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const event = await this.eventRepository.findByIdWithSpaceId(cmd.eventId, cmd.spaceId);
			if (!event) {
				throw new NotFoundException('Событие не найдено');
			}

			if (typeof cmd.orderIndex !== 'undefined') {
				if (!Number.isInteger(cmd.orderIndex) || cmd.orderIndex < 0) {
					throw new BadRequestException('orderIndex должен быть >= 0');
				}

				if (event.frequency === 'NEVER') {
					if (cmd.orderIndex !== 0) {
						throw new BadRequestException(
							'Для одноразового события orderIndex может быть только 0',
						);
					}
				} else {
					const overrides = await this.eventOverrideRepository.findByEventId(event.id);
					const currentOverride = overrides.find(
						(override) => override.orderIndex === cmd.orderIndex,
					);

					if (
						currentOverride &&
						!currentOverride.isOffsetOnce &&
						!currentOverride.isDeleted
					) {
						// Если удаляем FUTURE-якорь, переносим его смещение на следующий
						// доступный индекс, чтобы хвост серии не "схлопнулся" к базе.
						await this.preserveFutureShiftAfterDeletion({
							eventId: event.id,
							deletedOrderIndex: cmd.orderIndex,
							futureShift: currentOverride.offset,
							overrides,
						});
					}

					const deleteOverride = new EventOverride({
						id: currentOverride?.id ?? crypto.randomUUID(),
						eventId: event.id,
						orderIndex: cmd.orderIndex,
						offset: 0,
						isDeleted: true,
						isOffsetOnce: true,
					});
					await this.eventOverrideRepository.upsert(deleteOverride);
					return;
				}
			}

			const reminderIds = event.reminders.map((reminder) => reminder.id);

			await this.eventRepository.delete(cmd.eventId, cmd.spaceId);

			for (const reminderId of reminderIds) {
				await this.reminderScheduler.unschedule(reminderId);
			}
		});
	}

	private async preserveFutureShiftAfterDeletion(params: {
		eventId: string;
		deletedOrderIndex: number;
		futureShift: number;
		overrides: EventOverride[];
	}): Promise<void> {
		const overrideByOrder = new Map<number, EventOverride>();
		for (const override of params.overrides) {
			if (override.orderIndex > params.deletedOrderIndex) {
				overrideByOrder.set(override.orderIndex, override);
			}
		}

		for (
			let step = 0, targetOrder = params.deletedOrderIndex + 1;
			step < MAX_OVERRIDE_REBASE_STEPS;
			step += 1, targetOrder += 1
		) {
			const targetOverride = overrideByOrder.get(targetOrder);

			if (!targetOverride) {
				const newOverride = new EventOverride({
					id: crypto.randomUUID(),
					eventId: params.eventId,
					orderIndex: targetOrder,
					offset: params.futureShift,
					isDeleted: false,
					isOffsetOnce: false,
				});
				await this.eventOverrideRepository.upsert(newOverride);
				return;
			}

			if (targetOverride.isDeleted || targetOverride.isOffsetOnce) {
				continue;
			}

			// Встретили следующий FUTURE-якорь: хвост уже стабилизирован.
			return;
		}

		throw new BadRequestException(
			'Не удалось перестроить серию: слишком длинная цепочка override',
		);
	}
}
