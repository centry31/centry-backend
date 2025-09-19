import { IsISO8601, IsNumber } from 'class-validator';

export class CreateSpaceInviteDto {
	@IsNumber() maxUses: number;
	@IsISO8601() expiresAt: string;
}
