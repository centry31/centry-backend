import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class UpdateEventDto {
	@IsOptional()
	@IsString()
	title?: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsDateString()
	start?: string;

	@IsOptional()
	@IsDateString()
	end?: string;

	@IsOptional()
	@IsBoolean()
	isAllDay?: boolean;
}
