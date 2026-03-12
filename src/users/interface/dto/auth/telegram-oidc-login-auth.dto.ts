import { IsNotEmpty, IsString } from 'class-validator';

export class TelegramOidcLoginAuthDto {
	@IsString()
	@IsNotEmpty()
	id_token: string;

	@IsString()
	@IsNotEmpty()
	nonceId: string;
}
