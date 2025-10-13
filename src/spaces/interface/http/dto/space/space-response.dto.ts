import { Expose } from 'class-transformer';

export class SpaceResponseDto {
	@Expose()
	id: string;

	@Expose()
	name: string;

	@Expose()
	description?: string;
}
