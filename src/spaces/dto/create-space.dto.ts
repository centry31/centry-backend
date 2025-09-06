import { IsOptional, IsString } from 'class-validator';

// TODO: add fields validation (length and etc)
export class CreateSpaceDto {
	@IsString()
	name: string;

	@IsOptional()
	@IsString()
	description?: string;
}
