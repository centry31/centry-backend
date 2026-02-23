import { IsOptional, IsString } from 'class-validator';

export class BmstuGroupsQueryDto {
	@IsOptional()
	@IsString()
	search?: string;
}
