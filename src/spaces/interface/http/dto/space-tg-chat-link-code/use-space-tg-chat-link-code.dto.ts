import { TgChatType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UseSpaceTgChatLinkCodeDto {
	@IsString()
	@IsNotEmpty()
	hashCode: string; // id.secret

	@IsString()
	@IsNotEmpty()
	chatTgId: string;

	@IsString()
	@IsNotEmpty()
	initiatedByTgId: string; // кто вызвал команду

	@IsString()
	@IsNotEmpty()
	userTgId: string; // кто владелец кода (для проверки)

	@IsEnum(TgChatType)
	chatType: TgChatType;

	@IsOptional()
	@IsString()
	chatTitle?: string;

	// topic/thread id; 0 = без темы
	@IsOptional()
	@IsInt()
	messageThreadId?: number;
}
