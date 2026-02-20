import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	IsArray,
	IsBoolean,
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
	@Max(60 * 24 * 14) // до 14 дней
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

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateEventReminderDto)
	@ArrayMaxSize(5)
	reminders?: CreateEventReminderDto[];

	@IsString()
	@IsNotEmpty()
	@IsIn(['NEVER', 'DAILY', 'WEEKLY', 'DOUBLE_WEEKLY', 'MONTHLY'])
	frequency: 'NEVER' | 'DAILY' | 'WEEKLY' | 'DOUBLE_WEEKLY' | 'MONTHLY';

	@IsOptional()
	@IsBoolean()
	isNotifyMessage?: boolean;

	@IsOptional()
	@IsString()
	@MaxLength(200)
	notifyMessage?: string;
}
