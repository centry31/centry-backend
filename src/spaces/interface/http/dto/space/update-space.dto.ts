import { IsOptional, IsString } from 'class-validator';

export class UpdateSpaceDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	description?: string;
}
