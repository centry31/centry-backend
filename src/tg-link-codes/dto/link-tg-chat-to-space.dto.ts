import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TgChatType } from '@prisma/client';

export class LinkTgChatToSpaceDto {
	@IsString() @IsNotEmpty() hashCode: string; // id.secret

	// TG ids как строки, дальше преобразуем в BigInt
	@IsString() @IsNotEmpty() chatTgId: string;
	@IsString() @IsNotEmpty() initiatedByTgId: string; // кто вызвал команду
	@IsString() @IsNotEmpty() userTgId: string; // кто владелец кода (для проверки)

	@IsEnum(TgChatType) chatType: TgChatType;

	@IsOptional() @IsString() chatTitle?: string;

	// topic/thread id; 0 = без темы
	@IsOptional() @IsInt() messageThreadId?: number;
}
