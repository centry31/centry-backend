import { IsUUID } from 'class-validator';

export class CreateLinkCodeDto {
	@IsUUID() spaceId: string;
	@IsUUID() createdByUserId: string;
}
