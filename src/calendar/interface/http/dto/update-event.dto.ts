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

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	repeatUntil?: Date;

	@Type(() => Number)
	@IsInt()
	@Min(1)
	duration: number;

	@IsString()
	@IsNotEmpty()
	@IsIn(['ONE', 'FUTURE'])
	updateType: 'ONE' | 'FUTURE';

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	orderIndex?: number;

	@IsString()
	@IsNotEmpty()
	@IsIn(['NEVER', 'DAILY', 'WEEKLY', 'DOUBLE_WEEKLY', 'MONTHLY'])
	frequency: 'NEVER' | 'DAILY' | 'WEEKLY' | 'DOUBLE_WEEKLY' | 'MONTHLY';

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => UpdateEventReminderDto)
	@ArrayMaxSize(5)
	reminders?: UpdateEventReminderDto[];
}
