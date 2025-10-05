import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CreateSpaceInviteCodeDto } from './dto/create-space-invite-code.dto';
import { SpaceInviteCodesRepository } from './space-invite-codes.repository';
import { SpacesRepository } from 'spaces/spaces.repository';

@Injectable()
export class SpaceInviteCodesService {
	constructor(
		private readonly spaceInviteCodesRepository: SpaceInviteCodesRepository,
		private readonly spacesRepository: SpacesRepository,
	) {}

	/** По факту использования кода: увеличиваем счётчик, при исчерпании — ставим usedAt */
	private async markUsed(code: string) {
		const updatedCode = await this.spaceInviteCodesRepository.incrementUsedCount(code);

		if (updatedCode.usedCount >= updatedCode.maxUses && !updatedCode.usedAt) {
			await this.spaceInviteCodesRepository.markUsedAt(code, new Date());
		}
	}

	/** Создаём одноразовый/многоразовый код */
	async createSpaceInviteCode(
		createSpaceInviteCodeDto: CreateSpaceInviteCodeDto,
		createdByUserId: string,
	) {
		const { maxUses, expiresAt, spaceId } = createSpaceInviteCodeDto;

		const code = randomBytes(8).toString('base64');
		await this.spaceInviteCodesRepository.createInviteCode({
			space: { connect: { id: spaceId } },
			code,
			expiresAt,
			maxUses,
			createdBy: {
				connect: { id: createdByUserId },
			},
		});

		return code;
	}

	// TODO: вынести валидацию raw в общий метод?
	/** Проверка кода: формат, срок, лимиты, сверка hash. */
	async exchangeSpaceInviteCode(code: string) {
		if (!code) {
			throw new HttpException('Некорректный формат кода', HttpStatus.BAD_REQUEST);
		}

		const foundCode = await this.spaceInviteCodesRepository.findInviteCodeByCode(code);
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
		const space = await this.spacesRepository.findById(exchangedCode.spaceId);

		if (!space) {
			throw new HttpException('Такого пространства не существует', HttpStatus.NOT_FOUND);
		}

		return space;
	}

	async acceptSpaceInviteCode(code: string, userId: string) {
		const exchangedCode = await this.exchangeSpaceInviteCode(code);

		const alreadyMember = await this.spacesRepository.findMembership(
			exchangedCode.spaceId,
			userId,
		);
		if (alreadyMember) return;

		await this.spacesRepository.addMemberToSpace(exchangedCode.spaceId, userId);

		await this.markUsed(code);
	}

	async deleteSpaceInviteCode(spaceId: string, code: string) {
		return this.spaceInviteCodesRepository.deleteInviteCode(spaceId, code);
	}

	/**
	 * Достает активные коды для приглашения в пространство
	 *
	 * Активный код - это код, которая не использован (usedAt) и не истек (expiresAt) на данный момент
	 * */
	async getActiveSpaceInviteCodes(spaceId: string) {
		return this.spaceInviteCodesRepository.findActiveInviteCodes(spaceId);
	}
}
