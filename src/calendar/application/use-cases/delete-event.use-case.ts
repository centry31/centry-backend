import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	REMINDER_PLANNING,
	ReminderPlanning,
} from 'calendar/application/ports/reminder-planning/reminder-planning.port';
import {
	REMINDER_SCHEDULER,
	ReminderScheduler,
} from 'calendar/application/ports/reminder-scheduler/reminder-scheduler.port';

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventNotificationService } from 'calendar/application/services/event-notification/event-notification.service';
import { parseRruleWithSourceOrThrow } from 'calendar/application/services/rrule/parse-rrule.helper';
import { runUseCase } from 'common/application/errors/run-use-case';
import { RRuleSet } from 'rrule';

type Cmd = {
	spaceId: string;
	eventId: string;

	scope: 'SERIES' | 'THIS';
	start: Date;

	isNotifyMessage?: boolean;
	notifyMessage?: string;
};

@Injectable()
export class DeleteEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(REMINDER_SCHEDULER)
		private readonly reminderScheduler: ReminderScheduler,

		@Inject(REMINDER_PLANNING)
		private readonly reminderPlanning: ReminderPlanning,

		private readonly eventNotificationService: EventNotificationService,
	) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const event = await this.eventRepository.findByIdWithSpaceId(cmd.eventId, cmd.spaceId);
			if (!event) {
				throw new NotFoundException('Такое событие не найдено');
			}

			if (cmd.scope === 'SERIES' || !event.rrule) {
				const notificationScope = event.rrule && cmd.scope === 'SERIES' ? 'SERIES' : 'ONE';

				await this.reminderScheduler.unscheduleMany(event.reminders.map((r) => r.id));
				await this.eventRepository.delete(event.id, event.spaceId);

				if (cmd.isNotifyMessage) {
					await this.eventNotificationService.notifyDeleted({
						spaceId: event.spaceId,
						scope: notificationScope,
						event: this.eventNotificationService.toSnapshot(event),
						customMessage: cmd.notifyMessage,
					});
				}
			} else if (cmd.scope === 'THIS') {
				const { rruleSet: parsedRrule, sourceRule } = parseRruleWithSourceOrThrow(
					event.rrule,
				);

				const nextMillisecond = new Date(cmd.start.getTime() + 1);
				const isOccurrenceInSeries =
					parsedRrule.between(cmd.start, nextMillisecond, true).length > 0;
				if (!isOccurrenceInSeries) {
					throw new BadRequestException('start не входит в серию');
				}

				const newRruleSet = new RRuleSet();
				newRruleSet.rrule(sourceRule);
				parsedRrule.exdates().forEach((exDate) => newRruleSet.exdate(exDate));
				newRruleSet.exdate(cmd.start);
				const newRruleString = newRruleSet.toString();

				event.changeRrule(newRruleString);
				await this.eventRepository.update(event);
				await this.reminderPlanning.replanEvent(event.id);

				if (cmd.isNotifyMessage) {
					await this.eventNotificationService.notifyDeleted({
						spaceId: event.spaceId,
						scope: 'THIS',
						event: this.eventNotificationService.toSnapshot(event, cmd.start),
						customMessage: cmd.notifyMessage,
					});
				}
			}
		});
	}
}
