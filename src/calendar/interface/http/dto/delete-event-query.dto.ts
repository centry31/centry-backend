import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional } from 'class-validator';

/**
 * DTO query-параметров для маршрута удаления.
 */
export class DeleteEventQueryDto {
	@IsOptional()
	@IsIn(['SERIES', 'THIS'])
	// По умолчанию в use-case используется SERIES.
	scope?: 'SERIES' | 'THIS';

	@IsOptional()
	@Type(() => Date)
	@IsDate()
	// Обязателен в runtime при scope=THIS.
	occurrenceStart?: Date;
}
