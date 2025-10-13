import { IsString } from 'class-validator';

export class GetInfoSpaceInviteCodeDto {
	@IsString({ message: 'Код должен быть строкой' })
	code: string;
}
