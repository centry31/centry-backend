import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { CreateLinkCodeDto } from './dto/create-link-code.dto';
import { randomBytes } from 'crypto';
import { addMinutes } from 'date-fns';
import * as bcrypt from 'bcrypt';
import { LinkTgChatToSpaceDto } from './dto/link-tg-chat-to-space.dto';

@Injectable()
export class TgLinkCodesService {
	constructor(private prisma: PrismaService) {}

	/** Создаём одноразовый/многоразовый код */
	async createLinkCode(dto: CreateLinkCodeDto, createdByUserId: string) {
		const { spaceId } = dto;

		const raw = randomBytes(16).toString('hex');
		const hashCode = await bcrypt.hash(raw, 10);
		const expiresAt = addMinutes(new Date(), 15);

		const rec = await this.prisma.spaceLinkCode.create({
			data: { spaceId, hashCode, expiresAt, maxUses: 1, createdByUserId },
			select: { id: true },
		});

		// возвращаем в UI «id.secret», сам secret не храним
		return `${rec.id}.${raw}`;
	}

	/** Проверка кода: формат, срок, лимиты, сверка hash. Возвращает безопасные поля. */
	async exchange(code: string) {
		if (!code || !code.includes('.')) {
			throw new HttpException('Некорректный формат кода', HttpStatus.BAD_REQUEST);
		}

		const [id, secret] = code.split('.', 2);
		if (!id || !secret) {
			throw new HttpException('Некорректный формат кода', HttpStatus.BAD_REQUEST);
		}

		const link = await this.prisma.spaceLinkCode.findUnique({ where: { id } });
		if (!link) throw new HttpException('Код не найден', HttpStatus.NOT_FOUND);
		if (link.usedAt) throw new HttpException('Код уже использован', HttpStatus.GONE);

		if (link.expiresAt < new Date()) throw new HttpException('Код устарел', HttpStatus.GONE);
		if (link.usedCount >= link.maxUses) {
			throw new HttpException('Лимит исчерпан', HttpStatus.GONE);
		}

		const ok = await bcrypt.compare(secret, link.hashCode);
		if (!ok) throw new HttpException('Код не найден', HttpStatus.NOT_FOUND);

		return link;
	}

	/** По факту использования кода: увеличиваем счётчик, при исчерпании — ставим usedAt */
	private async markUsed(id: string) {
		const updated = await this.prisma.spaceLinkCode.update({
			where: { id },
			data: { usedCount: { increment: 1 } },
		});

		if (updated.usedCount >= updated.maxUses && !updated.usedAt) {
			await this.prisma.spaceLinkCode.update({
				where: { id },
				data: { usedAt: new Date() },
			});
		}
	}

	/** Привязка чат/топик к пространству кодом */
	async linkTgChatToSpace(dto: LinkTgChatToSpaceDto) {
		const {
			chatType,
			chatTitle,
			chatTgId,
			userTgId,
			hashCode,
			initiatedByTgId,
			messageThreadId,
		} = dto;

		// 1) валидируем код, получаем владельца
		const link = await this.exchange(hashCode);
		const linkOwner = await this.prisma.user.findUnique({
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
		const linkedChat = await this.prisma.spaceTgChat.upsert({
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
		await this.markUsed(link.id);

		return linkedChat;
	}
}
