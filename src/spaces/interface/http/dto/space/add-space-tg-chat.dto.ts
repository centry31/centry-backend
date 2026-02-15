import { TgChatType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddSpaceTgChatDto {
	@IsString()
	@IsNotEmpty()
	hashCode: string; // id.secret

	@IsString()
	@IsNotEmpty()
	@Type(() => BigInt)
	chatTgId: bigint;

	@IsString()
	@IsNotEmpty()
	@Type(() => BigInt)
	initiatedByTgId: bigint; // кто вызвал команду

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
