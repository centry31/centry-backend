import { IsString, IsOptional, IsDateString } from 'class-validator';
import { IsBoolean, IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEventReminderDto } from 'event-reminders/dto/create-event-reminder.dto';

export class CreateEventDto {
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

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateEventReminderDto)
	@ArrayMaxSize(5)
	reminders?: CreateEventReminderDto[];
}
