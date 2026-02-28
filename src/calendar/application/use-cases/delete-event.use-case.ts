import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';
import { RRuleSet, rrulestr } from 'rrule';

type Cmd = {
	spaceId: string;
	eventId: string;
	scope: 'SERIES' | 'THIS';
	start: Date;
};

@Injectable()
export class DeleteEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(REMINDER_SCHEDULER)
		private readonly reminderScheduler: ReminderScheduler,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const event = await this.eventRepository.findByIdWithSpaceId(cmd.eventId, cmd.spaceId);
			if (!event) {
				throw new NotFoundException('Такое событие не найдено');
			}

			if (cmd.scope === 'SERIES' || !event.rrule) {
				return await this.eventRepository.delete(event.id, event.spaceId);
			}

			if (cmd.scope === 'THIS') {
				const parsedRrule = rrulestr(event.rrule, { forceset: true });

				if (!(parsedRrule instanceof RRuleSet)) {
					throw new BadRequestException('Некорректное правило повторения');
				}
				const sourceRule = parsedRrule.rrules()[0];

				const newRruleSet = new RRuleSet();
				newRruleSet.rrule(sourceRule);
				newRruleSet.exdate(cmd.start);
				const newRruleString = newRruleSet.toString();

				event.changeRrule(newRruleString);
				await this.eventRepository.update(event);
			}
		});
	}
}
