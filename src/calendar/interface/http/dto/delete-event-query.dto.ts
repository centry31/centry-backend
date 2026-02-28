import { Type } from 'class-transformer';
import { IsDate, IsIn } from 'class-validator';

export class DeleteEventQueryDto {
	@IsIn(['SERIES', 'THIS'])
	scope: 'SERIES' | 'THIS';

	@Type(() => Date)
	@IsDate()
	start: Date;
}
