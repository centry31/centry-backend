import { IsOptional, IsString } from 'class-validator';

// TODO: add fields validation (length and etc)
export class UpdateSpaceDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	description?: string;
}
