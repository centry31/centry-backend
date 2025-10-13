import { Expose } from 'class-transformer';

export class SpaceInviteCodeResponseDto {
	@Expose()
	code: string;

	@Expose()
	maxUses: number;

	@Expose()
	usedCount: number;

	@Expose()
	expiresAt: string;
}
