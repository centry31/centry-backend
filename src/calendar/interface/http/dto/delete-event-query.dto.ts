import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteEventQueryDto {
	@IsIn(['SERIES', 'THIS'])
	scope: 'SERIES' | 'THIS';

	@Type(() => Date)
	@IsDate()
	start: Date;

	@Type(() => Boolean)
	@IsOptional()
	@IsBoolean()
	isNotifyMessage?: boolean;

	@IsOptional()
	@IsString()
	@MaxLength(200)
	notifyMessage?: string;
}
