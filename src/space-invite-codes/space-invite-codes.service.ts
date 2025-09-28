import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { randomBytes } from 'crypto';
import { CreateSpaceInviteCodeDto } from './dto/create-space-invite-code.dto';

@Injectable()
export class SpaceInviteCodesService {
	constructor(private prismaService: PrismaService) {}

	/** По факту использования кода: увеличиваем счётчик, при исчерпании — ставим usedAt */
	private async markUsed(code: string) {
		const updatedCode = await this.prismaService.spaceInviteCode.update({
			where: { code },
			data: { usedCount: { increment: 1 } },
		});

		if (updatedCode.usedCount >= updatedCode.maxUses && !updatedCode.usedAt) {
			await this.prismaService.spaceInviteCode.update({
				where: { code },
				data: { usedAt: new Date() },
			});
		}
	}

	/** Создаём одноразовый/многоразовый код */
	async createSpaceInviteCode(
		createSpaceInviteCodeDto: CreateSpaceInviteCodeDto,
		createdByUserId: string,
	) {
		const { maxUses, expiresAt, spaceId } = createSpaceInviteCodeDto;

		const code = randomBytes(8).toString('base64');
		await this.prismaService.spaceInviteCode.create({
			data: { spaceId, code, expiresAt, maxUses, createdByUserId },
		});

		return code;
	}

	// TODO: вынести валидацию raw в общий метод?
	/** Проверка кода: формат, срок, лимиты, сверка hash. */
	async exchangeSpaceInviteCode(code: string) {
		if (!code) {
			throw new HttpException('Некорректный формат кода', HttpStatus.BAD_REQUEST);
		}

		const foundCode = await this.prismaService.spaceInviteCode.findUnique({ where: { code } });
		if (!foundCode) throw new HttpException('Код приглашения не найден', HttpStatus.NOT_FOUND);

		if (foundCode.expiresAt < new Date()) {
			throw new HttpException('Код приглашения устарел', HttpStatus.GONE);
		}
		if (foundCode.usedCount >= foundCode.maxUses || foundCode.usedAt) {
			throw new HttpException(
				'Лимит использования кода приглашения исчерпан',
				HttpStatus.GONE,
			);
		}

		return foundCode;
	}

	async getSpaceInfoFromInviteCode(code: string) {
		const exchangedCode = await this.exchangeSpaceInviteCode(code);
		const space = await this.prismaService.space.findFirst({
			where: { id: exchangedCode.spaceId },
		});

		if (!space) {
			throw new HttpException('Такого пространства не существует', HttpStatus.NOT_FOUND);
		}

		return space;
	}

	async acceptSpaceInviteCode(code: string, userId: string) {
		const exchangedCode = await this.exchangeSpaceInviteCode(code);

		const alreadyMember = await this.prismaService.spaceMember.findFirst({
			where: { spaceId: exchangedCode.spaceId, userId },
		});
		if (alreadyMember) return;

		await this.prismaService.space.update({
			where: { id: exchangedCode.spaceId },
			data: { SpaceMember: { create: { userId } } },
		});

		await this.markUsed(code);
	}

	async deleteSpaceInviteCode(spaceId: string, code: string) {
		return this.prismaService.spaceInviteCode.delete({ where: { code, spaceId } });
	}

	/**
	 * Достает активные коды для приглашения в пространство
	 *
	 * Активный код - это код, которая не использован (usedAt) и не истек (expiresAt) на данный момент
	 * */
	async getActiveSpaceInviteCodes(spaceId: string) {
		return this.prismaService.spaceInviteCode.findMany({
			where: {
				spaceId,
				usedAt: null,
				expiresAt: { gt: new Date() }, // ссылка ещё не истекла
			},
		});
	}
}
