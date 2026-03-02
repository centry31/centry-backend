import { BadRequestException } from '@nestjs/common';
import type { RRule } from 'rrule';
import { RRuleSet, rrulestr } from 'rrule';

const INVALID_RRULE_ERROR = 'Некорректное правило повторения';

export const parseRruleSetOrThrow = (
	rrule: string,
	errorMessage: string = INVALID_RRULE_ERROR,
): RRuleSet => {
	const parsed = rrulestr(rrule, { forceset: true });
	if (!(parsed instanceof RRuleSet)) {
		throw new BadRequestException(errorMessage);
	}

	return parsed;
};

export const getSourceRuleOrThrow = (
	rruleSet: RRuleSet,
	errorMessage: string = INVALID_RRULE_ERROR,
): RRule => {
	const sourceRule = rruleSet.rrules()[0];
	if (!sourceRule) {
		throw new BadRequestException(errorMessage);
	}

	return sourceRule;
};

export const parseRruleWithSourceOrThrow = (
	rrule: string,
	errorMessage: string = INVALID_RRULE_ERROR,
): { rruleSet: RRuleSet; sourceRule: RRule } => {
	const rruleSet = parseRruleSetOrThrow(rrule, errorMessage);
	const sourceRule = getSourceRuleOrThrow(rruleSet, errorMessage);

	return { rruleSet, sourceRule };
};
