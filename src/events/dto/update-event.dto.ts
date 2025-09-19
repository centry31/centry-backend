import { IsString, IsOptional, IsDateString, IsBoolean, IsArray } from 'class-validator';
import { ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEventReminderDto } from 'event-reminders/dto/create-event-reminder.dto';

export class UpdateEventDto {
	@IsString()
	title: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsDateString()
	start: string;

	@IsDateString()
	end: string;

	@IsOptional()
	@IsBoolean()
	isAllDay?: boolean;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateEventReminderDto)
	@ArrayMaxSize(5)
	reminders: CreateEventReminderDto[];
}
