import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional } from 'class-validator';

export class DeleteEventQueryDto {
	@IsOptional()
	@IsIn(['SERIES', 'THIS'])
	scope: 'SERIES' | 'THIS';

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	start: Date;
}
