import { IsOptional, IsString } from 'class-validator';

export class CreateSpaceDto {
	@IsString({ message: 'Пространство должно содержать строковое имя' })
	name: string;

	@IsOptional()
	@IsString()
	description?: string;
}
