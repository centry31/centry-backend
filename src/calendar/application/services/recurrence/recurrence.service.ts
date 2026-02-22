import { DomainValidationError } from 'common/domain/errors/domain.error';

import { Injectable } from '@nestjs/common';
import { type Options as RRuleOptions, RRule } from 'rrule';

export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'DOUBLE_WEEKLY' | 'MONTHLY';
export type RecurrenceConfig = {
	type: RecurrenceType;
	until?: Date;
};

type RuleContext = {
	start: Date;
	rrule?: string;
	timeZone: string;
};

const RRULE_PREFIX = 'RRULE:';

@Injectable()
export class RecurrenceService {
	validateTimeZone(timeZone: string): void {
		try {
			new Intl.DateTimeFormat('en-US', { timeZone });
		} catch {
			throw new DomainValidationError('Invalid IANA timeZone');
		}
	}

	buildRRule(params: {
		recurrence: RecurrenceConfig;
		start: Date;
		timeZone: string;
	}): string | null {
		const { recurrence, start, timeZone } = params;
		if (recurrence.type === 'NONE') {
			return null;
		}

		this.validateTimeZone(timeZone);
		const options: Partial<RRuleOptions> = {
			freq: this.toRRuleFreq(recurrence.type),
			interval: recurrence.type === 'DOUBLE_WEEKLY' ? 2 : 1,
			dtstart: start,
			tzid: timeZone,
		};
		if (recurrence.until) {
			options.until = recurrence.until;
		}

		const rule = new RRule(options);
		return this.normalizeRRuleString(rule.toString());
	}

	parseRRule(rrule?: string | null): RecurrenceConfig {
		if (!rrule) {
			return { type: 'NONE' };
		}

		const parsed = RRule.parseString(this.normalizeRRuleString(rrule));
		const interval = parsed.interval ?? 1;
		const freq = parsed.freq;

		if (freq === RRule.DAILY && interval === 1) {
			return { type: 'DAILY', until: parsed.until ?? undefined };
		}
		if (freq === RRule.WEEKLY && interval === 1) {
			return { type: 'WEEKLY', until: parsed.until ?? undefined };
		}
		if (freq === RRule.WEEKLY && interval === 2) {
			return { type: 'DOUBLE_WEEKLY', until: parsed.until ?? undefined };
		}
		if (freq === RRule.MONTHLY && interval === 1) {
			return { type: 'MONTHLY', until: parsed.until ?? undefined };
		}

		throw new DomainValidationError('Unsupported recurrence rule');
	}

	isOccurrenceInSeries(params: RuleContext & { occurrenceStart: Date }): boolean {
		const { occurrenceStart } = params;
		if (!params.rrule) {
			return params.start.getTime() === occurrenceStart.getTime();
		}

		const rule = this.createRule(params);
		const previousTick = new Date(occurrenceStart.getTime() - 1);
		const next = rule.after(previousTick, true);
		return Boolean(next && next.getTime() === occurrenceStart.getTime());
	}

	getPreviousOccurrence(params: RuleContext & { occurrenceStart: Date }): Date | null {
		if (!params.rrule) {
			return null;
		}

		const rule = this.createRule(params);
		return rule.before(params.occurrenceStart, false) ?? null;
	}

	getNextOccurrence(params: RuleContext & { fromInclusive: Date }): Date | null {
		if (!params.rrule) {
			return params.start.getTime() >= params.fromInclusive.getTime() ? params.start : null;
		}

		const rule = this.createRule(params);
		const lowerBound = new Date(params.fromInclusive.getTime() - 1);
		return rule.after(lowerBound, true) ?? null;
	}

	iterateOccurrencesInRange(params: RuleContext & { from: Date; to: Date }): Date[] {
		const { from, to } = params;
		if (from.getTime() >= to.getTime()) {
			return [];
		}

		if (!params.rrule) {
			const singleInRange =
				params.start.getTime() >= from.getTime() && params.start.getTime() < to.getTime();
			return singleInRange ? [params.start] : [];
		}

		const rule = this.createRule(params);
		const occurrences = rule.between(from, to, true);
		return occurrences.filter((date) => date.getTime() < to.getTime());
	}

	setUntil(params: RuleContext & { until: Date }): string {
		if (!params.rrule) {
			throw new DomainValidationError('Cannot set UNTIL for non-recurring event');
		}

		const parsed = RRule.parseString(this.normalizeRRuleString(params.rrule));
		const rule = new RRule({
			...parsed,
			until: params.until,
			dtstart: params.start,
			tzid: params.timeZone,
		});
		return this.normalizeRRuleString(rule.toString());
	}

	private createRule(params: RuleContext): RRule {
		this.validateTimeZone(params.timeZone);
		const parsed = RRule.parseString(this.normalizeRRuleString(params.rrule));
		return new RRule({
			...parsed,
			dtstart: params.start,
			tzid: params.timeZone,
		});
	}

	private toRRuleFreq(type: Exclude<RecurrenceType, 'NONE'>): number {
		switch (type) {
			case 'DAILY':
				return RRule.DAILY;
			case 'WEEKLY':
			case 'DOUBLE_WEEKLY':
				return RRule.WEEKLY;
			case 'MONTHLY':
				return RRule.MONTHLY;
			default:
				throw new DomainValidationError('Unsupported recurrence type');
		}
	}

	private normalizeRRuleString(value: string): string {
		const normalized = value.trim();
		if (!normalized) {
			throw new DomainValidationError('rrule cannot be empty');
		}

		const lines = normalized.split(/\r?\n/).map((line) => line.trim());
		const rruleLine = lines.find((line) => line.startsWith(RRULE_PREFIX));
		if (rruleLine) {
			return rruleLine;
		}

		return `${RRULE_PREFIX}${normalized.replace(/^RRULE:/, '')}`;
	}
}
