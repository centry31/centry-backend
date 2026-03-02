import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

/**
 * DTO query-параметров для получения списка событий.
 *
 * Диапазон интерпретируется как полуинтервал `[from, to)`.
 */
export class GetEventsQueryDto {
	@Type(() => Date)
	@IsDate()
	from: Date;

	@Type(() => Date)
	@IsDate()
	to: Date;
}
