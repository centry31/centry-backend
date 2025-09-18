import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { CreateSpaceInviteDto } from 'space-invites/dto/create-space-invite.dto';

@Injectable()
export class SpaceInvitesService {
	constructor(private prismaService: PrismaService) {}

	/** Создаём одноразовую/многоразовую ссылку */
	async createInviteLink(
		createSpaceInviteDto: CreateSpaceInviteDto,
		createdByUserId: string,
		spaceId: string,
	) {
		const { maxUses, expiresAt } = createSpaceInviteDto;

		const raw = randomBytes(16).toString('hex');
		const hashCode = await bcrypt.hash(raw, 10);

		const rec = await this.prismaService.spaceLinkCode.create({
			data: { spaceId, hashCode, expiresAt, maxUses, createdByUserId },
			select: { id: true },
		});

		// возвращаем в UI «id.secret», сам secret не храним
		return `${rec.id}.${raw}`;
	}

	// TODO: вынести валидацию кода в общий метод?
	/** Проверка кода: формат, срок, лимиты, сверка hash. */
	async exchangeInviteLink(code: string) {
		if (!code || !code.includes('.')) {
			throw new HttpException('Некорректный формат ссылки', HttpStatus.BAD_REQUEST);
		}

		const [id, secret] = code.split('.', 2);
		if (!id || !secret) {
			throw new HttpException('Некорректный формат ссылки', HttpStatus.BAD_REQUEST);
		}

		const link = await this.prismaService.spaceInvite.findUnique({ where: { id } });
		if (!link) throw new HttpException('Ссылка не найдена', HttpStatus.NOT_FOUND);

		if (link.expiresAt < new Date()) {
			throw new HttpException('Ссылка устарела', HttpStatus.GONE);
		}
		if (link.usedCount >= link.maxUses || link.usedAt) {
			throw new HttpException('Лимит использования ссылки исчерпан', HttpStatus.GONE);
		}

		const ok = await bcrypt.compare(secret, link.hashCode);
		if (!ok) throw new HttpException('Ссылка не найдена', HttpStatus.NOT_FOUND);

		return link;
	}

	async getSpaceInfoFromInviteLink(code: string) {
		const link = await this.exchangeInviteLink(code);
		const space = await this.prismaService.spaceLinkCode.findUnique({
			where: { id: link.spaceId },
		});

		if (!space) {
			throw new HttpException('Такого пространства не существует', HttpStatus.NOT_FOUND);
		}

		return space;
	}

	async acceptInviteLink(code: string, userId: string) {
		const link = await this.exchangeInviteLink(code);
		await this.prismaService.space.update({
			where: { id: link.spaceId },
			data: { SpaceMember: { create: { userId } } },
		});
	}
}
