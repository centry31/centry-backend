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

class UpdateEventReminderDto {
	@IsInt()
	@Min(0)
	@Max(60 * 24 * 14)
	offsetMinutes: number;
}

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
	scope: 'SERIES' | 'THIS' | 'THIS_AND_FUTURE';

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	occurrenceStart?: Date;

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => UpdateEventReminderDto)
	@ArrayMaxSize(5)
	reminders?: UpdateEventReminderDto[];
}
