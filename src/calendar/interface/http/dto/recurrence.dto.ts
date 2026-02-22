import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional } from 'class-validator';

export const RECURRENCE_TYPES = ['NONE', 'DAILY', 'WEEKLY', 'DOUBLE_WEEKLY', 'MONTHLY'];

export type RecurrenceTypeDto = (typeof RECURRENCE_TYPES)[number];

export class RecurrenceDto {
	@IsIn(RECURRENCE_TYPES)
	type: RecurrenceTypeDto;

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	until?: Date;
}
