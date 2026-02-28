import type { Event } from 'calendar/domain/event.entity';

import { BadRequestException } from '@nestjs/common';
import { Frequency, RRuleSet, rrulestr } from 'rrule';

const mapRruleFrequency = (frequency: Frequency, interval: number) => {
	switch (frequency) {
		case Frequency.DAILY:
			return 'DAILY';
		case Frequency.WEEKLY: {
			if (interval === 1) return 'WEEKLY';
			if (interval === 2) return 'DOUBLE_WEEKLY';
			break;
		}
		case Frequency.MONTHLY:
			return 'MONTHLY';
		default:
			return 'NEVER';
	}
};

type EventReminderResponse = { offsetMinutes: number };
type EventResponse = {
	id: string;
	spaceId: string;
	createdById: string;

	title: string;
	description: string | null;

	start: Date;
	until?: Date;
	frequency?: string; // TODO: типизировать

	duration: number;
	timeZone: string;

	reminders: EventReminderResponse[];
};

export const toEventResponse = (event: Event): EventResponse => {
	const reminders: EventReminderResponse[] = event.reminders.map((reminder) => ({
		offsetMinutes: reminder.offsetMinutes,
	}));

	let frequency = 'NEVER';
	let until: Date | null = null;

	if (event.rrule) {
		// TODO: вытащить это в хелпер
		const parsedRrule = rrulestr(event.rrule, { forceset: true });
		if (!(parsedRrule instanceof RRuleSet)) {
			throw new BadRequestException('Некорректное правило повторения');
		}

		const sourceRule = parsedRrule.rrules()[0];

		frequency = mapRruleFrequency(sourceRule.options.freq, sourceRule.options.interval);
		until = sourceRule.options.until;
	}

	return {
		id: event.id,
		spaceId: event.spaceId,
		createdById: event.createdById,

		title: event.title,
		description: event.description ?? null,

		start: event.start.value,
		until,
		frequency,

		duration: event.duration,
		timeZone: event.timeZone,

		reminders,
	};
};
