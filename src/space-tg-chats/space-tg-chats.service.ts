import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { LinkTgChatToSpaceDto } from './dto/link-tg-chat-to-space.dto';
import { SpaceLinkCodesService } from 'space-link-codes/space-link-codes.service';
import { BotAdapter } from 'bot/bot.adapter';

@Injectable()
export class SpaceTgChatsService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly tgLinkCodesService: SpaceLinkCodesService,
		private readonly tgBot: BotAdapter,
	) {}

	async linkTgChatToSpace(linkTgChatToSpaceDto: LinkTgChatToSpaceDto) {
		const {
			chatType,
			chatTitle,
			chatTgId,
			userTgId,
			hashCode,
			initiatedByTgId,
			messageThreadId,
		} = linkTgChatToSpaceDto;

		// 1) валидируем код, получаем владельца
		const link = await this.tgLinkCodesService.exchange(hashCode);
		const linkOwner = await this.prismaService.user.findUnique({
			where: { id: link.createdByUserId },
		});
		if (!linkOwner) {
			throw new HttpException('Владелец кода не найден', HttpStatus.NOT_FOUND);
		}

		// 2) проверяем, что /link нажал именно владелец
		if (BigInt(userTgId) !== linkOwner.tgId) {
			throw new HttpException(
				'У вас нет прав привязывать пространство по этому коду',
				HttpStatus.FORBIDDEN,
			);
		}

		// 3) нормализуем идентификаторы
		const chatIdBig = BigInt(chatTgId);
		const initiatedByBig = BigInt(initiatedByTgId);
		const threadId = messageThreadId ?? 0; // 0 = без темы

		// 4) upsert по уникальному ключу
		const linkedChat = await this.prismaService.spaceTgChat.upsert({
			where: {
				spaceId_chatTgId_messageThreadId: {
					spaceId: link.spaceId,
					chatTgId: chatIdBig,
					messageThreadId: threadId,
				},
			},
			update: {
				chatType,
				chatTitle,
				initiatedByTgId: initiatedByBig,
				isActive: true,
			},
			create: {
				spaceId: link.spaceId,
				chatTgId: chatIdBig,
				chatType,
				chatTitle,
				messageThreadId: threadId,
				initiatedByTgId: initiatedByBig,
				isActive: true,
			},
		});

		// 5) списываем использование кода
		await this.tgLinkCodesService.markUsed(link.id);

		return linkedChat;
	}

	async removeTgChatFromSpace(spaceId: string, chatId: string) {
		const removedChat = await this.prismaService.spaceTgChat.delete({
			where: { id: chatId, spaceId },
			include: { space: true },
		});

		await this.tgBot.sendMessage(
			String(removedChat.chatTgId),
			`Этот чат отвязан от пространства ${removedChat.space.name}`,
		);

		return removedChat;
	}

	async getSpaceTgChats(spaceId: string) {
		return this.prismaService.spaceTgChat.findMany({ where: { spaceId } });
	}
}
