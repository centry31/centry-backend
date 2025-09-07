import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

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
}
