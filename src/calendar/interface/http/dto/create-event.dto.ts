import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	IsArray,
	IsBoolean,
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

class CreateEventReminderDto {
	@IsInt()
	@Min(0)
	@Max(60 * 24 * 14)
	offsetMinutes: number;
}
type Frequency = 'NEVER' | 'DAILY' | 'WEEKLY' | 'DOUBLE_WEEKLY' | 'MONTHLY';

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

	@IsIn(['NEVER', 'DAILY', 'WEEKLY', 'DOUBLE_WEEKLY', 'MONTHLY'])
	frequency: Frequency;

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	until?: Date;

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
