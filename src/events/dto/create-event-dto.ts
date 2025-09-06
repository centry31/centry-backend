import { IsString, IsOptional, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import { EventType } from '@prisma/client';

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

	@IsEnum(EventType)
	type: EventType;

	@IsString()
	spaceId: string;
}
