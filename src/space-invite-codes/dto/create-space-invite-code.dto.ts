import { IsISO8601, IsNumber, IsUUID } from 'class-validator';

export class CreateSpaceInviteCodeDto {
	@IsNumber() maxUses: number;
	@IsISO8601() expiresAt: string;
	@IsUUID() spaceId: string;
}
