import { RecurrenceDto } from './recurrence.dto';

import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	IsArray,
	IsDate,
	IsIn,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator';

/**
 * DTO напоминания для маршрута обновления.
 */
class UpdateEventReminderDto {
	@IsInt()
	@Min(0)
	@Max(60 * 24 * 14)
	offsetMinutes: number;
}

/**
 * DTO запроса на обновление события.
 *
 * Endpoint использует детерминированную семантику полного обновления полей.
 */
export class UpdateEventDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	title: string;

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	description?: string;

	@Type(() => Date)
	start: Date;

	@Type(() => Number)
	@IsInt()
	@Min(1)
	duration: number;

	@IsString()
	@IsNotEmpty()
	timeZone: string;

	@ValidateNested()
	@Type(() => RecurrenceDto)
	recurrence: RecurrenceDto;

	@IsString()
	@IsNotEmpty()
	@IsIn(['SERIES', 'THIS', 'THIS_AND_FUTURE'])
	// Определяет scope изменения для recurring-событий.
	scope: 'SERIES' | 'THIS' | 'THIS_AND_FUTURE';

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	// Обязателен в runtime для THIS и THIS_AND_FUTURE на recurring-событиях.
	occurrenceStart?: Date;

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => UpdateEventReminderDto)
	@ArrayMaxSize(5)
	reminders?: UpdateEventReminderDto[];
}
