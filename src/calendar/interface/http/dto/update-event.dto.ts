import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	IsArray,
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
	@Max(60 * 24 * 14) // до 14 дней
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

	@Type(() => Date)
	end: Date;

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => UpdateEventReminderDto)
	@ArrayMaxSize(5)
	reminders?: UpdateEventReminderDto[];
}
