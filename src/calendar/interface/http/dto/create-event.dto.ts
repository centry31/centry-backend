import { RecurrenceDto } from './recurrence.dto';

import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	IsArray,
	IsBoolean,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator';

class CreateEventReminderDto {
	@IsInt()
	@Min(0)
	@Max(60 * 24 * 14)
	offsetMinutes: number;
}

export class CreateEventDto {
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

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateEventReminderDto)
	@ArrayMaxSize(5)
	reminders?: CreateEventReminderDto[];

	@IsOptional()
	@IsBoolean()
	isNotifyMessage?: boolean;

	@IsOptional()
	@IsString()
	@MaxLength(200)
	notifyMessage?: string;
}
