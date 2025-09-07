import { Expose, Type } from 'class-transformer';

class CreatedByMiniDto {
	@Expose() id: string;
	@Expose() displayName: string;
	@Expose() username?: string;
}

class SpaceMiniDto {
	@Expose() id: string;
	@Expose() name: string;
}

export class EventDto {
	@Expose() id: string;
	@Expose() title: string;
	@Expose() start: string;
	@Expose() end: string;
	@Expose() isAllDay: boolean;
	@Expose() location?: string;
	@Expose() description?: string;

	// опциональные связи — только публичные поля
	@Expose() @Type(() => CreatedByMiniDto) createdBy?: CreatedByMiniDto;
	@Expose() @Type(() => SpaceMiniDto) space?: SpaceMiniDto;
}
