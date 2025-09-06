import { Expose, Type } from 'class-transformer';

class OwnerMiniDto {
	@Expose() id: string;
	@Expose() displayName: string;
	@Expose() username?: string;
}

export class SpaceDto {
	@Expose() id: string;
	@Expose() name: string;
	@Expose() description?: string;

	@Expose() @Type(() => OwnerMiniDto) createdBy?: OwnerMiniDto;
}
