import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { Inject, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
	eventId: string;
};

export class DeleteEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepository,
		@Inject(REMINDER_SCHEDULER) private readonly reminderScheduler: ReminderScheduler,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const event = await this.eventRepository.findByIdWithSpaceId(cmd.eventId, cmd.spaceId);
			if (!event) {
				throw new NotFoundException('Событие не найдено');
			}
			const reminderIds = event.reminders.map((reminder) => reminder.id);

			await this.eventRepository.delete(cmd.eventId, cmd.spaceId);

			for (const reminderId of reminderIds) {
				await this.reminderScheduler.unschedule(reminderId);
			}
		});
	}
}
