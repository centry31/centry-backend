import { IsString } from 'class-validator';

export class AcceptSpaceInviteCodeDto {
	@IsString({ message: 'Код должен быть строкой' })
	code: string;
}
