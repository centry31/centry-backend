import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class DeleteEventQueryDto {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	orderIndex?: number;
}
