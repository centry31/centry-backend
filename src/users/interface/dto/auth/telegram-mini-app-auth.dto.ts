import { IsNotEmpty, IsString } from 'class-validator';

export class TelegramMiniAppAuthDto {
	@IsString()
	@IsNotEmpty()
	initData: string;
}
