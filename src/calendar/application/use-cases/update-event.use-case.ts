import * as crypto from 'crypto';

import { Event } from 'calendar/domain/event.entity';
import { EventReminder } from 'calendar/domain/event-reminder.entity';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';
import { Frequency, RRule, RRuleSet, rrulestr } from 'rrule';
import { SPACE_TG_CHAT_QUERY, SpaceTgChatQuery } from 'spaces';

type Reminder = { offsetMinutes: number };
type EventFrequency = 'NEVER' | 'DAILY' | 'WEEKLY' | 'DOUBLE_WEEKLY' | 'MONTHLY';
type Cmd = {
	id: string;
	title: string;
	description: string | null;

	newStart: Date;
	oldStart: Date;

	occurrenceStart?: Date;
	duration: number;
	timeZone: string;

	until?: Date;
	frequency: EventFrequency;
	scope: 'THIS' | 'THIS_AND_FUTURE';

	spaceId: string;

	reminders: Reminder[];
};

@Injectable()
export class UpdateEventUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY)
		private readonly eventRepository: EventRepository,

		@Inject(SPACE_TG_CHAT_QUERY)
		private readonly spaceTgChatQuery: SpaceTgChatQuery,
	) {}

	private mapFrequencyToRrule = (frequency: EventFrequency) => {
		switch (frequency) {
			case 'DAILY':
				return { frequency: Frequency.DAILY, interval: 1 };
			case 'WEEKLY':
				return { frequency: Frequency.WEEKLY, interval: 1 };
			case 'DOUBLE_WEEKLY':
				return { frequency: Frequency.WEEKLY, interval: 2 };
			case 'MONTHLY':
				return { frequency: Frequency.MONTHLY, interval: 1 };
		}
	};

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const event = await this.eventRepository.findByIdWithSpaceId(cmd.id, cmd.spaceId);
			if (!event) throw new NotFoundException('Событие не найдено');

			const spaceTgChats = await this.spaceTgChatQuery.getActiveTargetsBySpaceId(cmd.spaceId);
			if (cmd.reminders.length && !spaceTgChats.length) {
				throw new BadRequestException(
					'Для установки напоминаний нужно иметь привязанные Telegram чаты',
				);
			}

			if (!event.rrule) {
				return this.updateOne(event, cmd);
			}

			const parsedRrule = rrulestr(event.rrule, { forceset: true });
			if (!(parsedRrule instanceof RRuleSet)) {
				throw new BadRequestException('Некорректное правило повторения');
			}
			const rruleSet = parsedRrule;

			if (cmd.scope === 'THIS') {
				return this.updateThis(event, cmd, rruleSet);
			}
			if (cmd.scope === 'THIS_AND_FUTURE') {
				return this.updateThisAndFuture(event, cmd, rruleSet);
			}
		});
	}

	private async updateOne(event: Event, cmd: Cmd) {
		const newStartVo = DateTime.fromDate(cmd.newStart);
		const createdAtVo = DateTime.now();

		event.changeTitle(cmd.title);
		event.changeDescription(cmd.description);
		event.changeTimeRange(newStartVo, cmd.duration);

		cmd.reminders.forEach((reminder) => {
			const eventReminder = new EventReminder({
				id: crypto.randomUUID(),
				eventId: event.id,
				createdAt: createdAtVo,
				updatedAt: createdAtVo,
				offsetMinutes: reminder.offsetMinutes,
			});
			event.addReminder(eventReminder);
		});

		if (cmd.frequency !== 'NEVER') {
			const rruleFreq = this.mapFrequencyToRrule(cmd.frequency);

			const rruleSet = new RRuleSet();
			const rrule = new RRule({
				dtstart: cmd.newStart,
				until: cmd.until,
				freq: rruleFreq.frequency,
				interval: rruleFreq.interval,
			});

			rruleSet.rrule(rrule);
			const rruleSetString = rruleSet.toString();
			event.changeRrule(rruleSetString);
		}

		await this.eventRepository.update(event);
	}

	private async updateThis(event: Event, cmd: Cmd, rruleSet: RRuleSet) {
		const createdAtVo = DateTime.now();
		const newStartVo = DateTime.fromDate(cmd.newStart);

		const newEvent = new Event({
			id: crypto.randomUUID(),
			title: cmd.title,
			description: cmd.description,
			start: newStartVo,
			duration: cmd.duration,
			spaceId: cmd.spaceId,
			createdById: event.createdById,
			timeZone: cmd.timeZone,
			createdAt: createdAtVo,
		});

		cmd.reminders.forEach((reminder) => {
			const eventReminder = new EventReminder({
				id: crypto.randomUUID(),
				eventId: newEvent.id,
				offsetMinutes: reminder.offsetMinutes,
				createdAt: createdAtVo,
				updatedAt: createdAtVo,
			});

			newEvent.addReminder(eventReminder);
		});

		if (cmd.frequency !== 'NEVER') {
			const newRruleSet = new RRuleSet();

			const rruleFreq = this.mapFrequencyToRrule(cmd.frequency);
			const newRrule = new RRule({
				dtstart: cmd.newStart,
				until: cmd.until,
				freq: rruleFreq.frequency,
				interval: rruleFreq.interval,
			});

			newRruleSet.rrule(newRrule);

			const newRruleSetString = newRruleSet.toString();
			newEvent.changeRrule(newRruleSetString);
		}

		rruleSet.exdate(cmd.oldStart);
		const rruleSetString = rruleSet.toString();
		event.changeRrule(rruleSetString);

		await this.eventRepository.create(newEvent);
		await this.eventRepository.update(event);
	}

	private async updateThisAndFuture(event: Event, cmd: Cmd, rruleSet: RRuleSet) {
		const createdAtVo = DateTime.now();
		const newStartVo = DateTime.fromDate(cmd.newStart);

		const newEvent = new Event({
			id: crypto.randomUUID(),
			title: cmd.title,
			description: cmd.description,
			start: newStartVo,
			duration: cmd.duration,
			spaceId: cmd.spaceId,
			createdById: event.createdById,
			timeZone: cmd.timeZone,
			createdAt: createdAtVo,
		});

		cmd.reminders.forEach((reminder) => {
			const eventReminder = new EventReminder({
				id: crypto.randomUUID(),
				eventId: newEvent.id,
				offsetMinutes: reminder.offsetMinutes,
				createdAt: createdAtVo,
				updatedAt: createdAtVo,
			});

			newEvent.addReminder(eventReminder);
		});

		if (cmd.frequency !== 'NEVER') {
			const newRruleSet = new RRuleSet();

			const rruleFreq = this.mapFrequencyToRrule(cmd.frequency);
			const newRrule = new RRule({
				dtstart: cmd.newStart,
				until: cmd.until,
				freq: rruleFreq.frequency,
				interval: rruleFreq.interval,
			});

			newRruleSet.rrule(newRrule);

			const newRruleSetString = newRruleSet.toString();
			newEvent.changeRrule(newRruleSetString);
		}

		const sourceRule = rruleSet.rrules()[0];
		if (!sourceRule) {
			throw new BadRequestException('Некорректное правило повторения');
		}

		const previousOccurrence = rruleSet.before(cmd.oldStart, false);
		const updatedExDates = rruleSet.exdates().filter((exDate) => {
			return exDate < cmd.oldStart;
		});

		// Если split в самом начале серии, то "прошлой" части не остается.
		if (!previousOccurrence) {
			await this.eventRepository.create(newEvent);
			await this.eventRepository.delete(event.id, cmd.spaceId);
			return;
		}

		const updatedRruleSet = new RRuleSet();
		const updatedRrule = new RRule({
			...sourceRule.origOptions,
			dtstart: sourceRule.options.dtstart,
			until: previousOccurrence,
		});
		updatedExDates.forEach((exDate) => {
			updatedRruleSet.exdate(exDate);
		});

		updatedRruleSet.rrule(updatedRrule);

		const updatedRruleSetString = updatedRruleSet.toString();
		event.changeRrule(updatedRruleSetString);

		await this.eventRepository.create(newEvent);
		await this.eventRepository.update(event);
	}
}
