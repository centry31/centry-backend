import { IsUUID } from 'class-validator';

export class CreateLinkCodeDto {
	@IsUUID() spaceId: string;
}
