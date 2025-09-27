import { Expose } from 'class-transformer';
import type { TgChatType } from '@prisma/client';

export class SpaceTgChatDto {
	@Expose() id: string;
	@Expose() chatType: TgChatType;
	@Expose() chatTitle?: string;
	@Expose() messageThreadId?: number;
	@Expose() isActive: boolean;
	@Expose() createdAt: string; // ISO
}
