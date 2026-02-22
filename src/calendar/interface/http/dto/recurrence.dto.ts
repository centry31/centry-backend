import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional } from 'class-validator';

/**
 * Разрешенные типы повторений в публичном API.
 */
export const RECURRENCE_TYPES = ['NONE', 'DAILY', 'WEEKLY', 'DOUBLE_WEEKLY', 'MONTHLY'] as const;

export type RecurrenceTypeDto = (typeof RECURRENCE_TYPES)[number];

/**
 * Публичный DTO повторений.
 *
 * `until` опционален и трактуется как верхняя включающая граница RRULE.
 */
export class RecurrenceDto {
	@IsIn(RECURRENCE_TYPES)
	type: RecurrenceTypeDto;

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	until?: Date;
}
