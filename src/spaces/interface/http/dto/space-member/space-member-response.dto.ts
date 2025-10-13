import { Expose } from 'class-transformer';

export class SpaceMemberResponseDto {
	@Expose()
	userId: string;

	@Expose()
	username: string;

	@Expose()
	displayName: string;
}
