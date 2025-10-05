import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateLinkCodeDto } from './dto/create-link-code.dto';
import { randomBytes } from 'crypto';
import { addMinutes } from 'date-fns';
import * as bcrypt from 'bcrypt';
import { SpaceLinkCodesRepository } from './space-link-codes.repository';

@Injectable()
export class SpaceLinkCodesService {
	constructor(private readonly spaceLinkCodesRepository: SpaceLinkCodesRepository) {}

	/** Создаём одноразовый код */
	async createLinkCode(dto: CreateLinkCodeDto, createdByUserId: string) {
		const { spaceId } = dto;

		const raw = randomBytes(16).toString('hex');
		const hashCode = await bcrypt.hash(raw, 10);
		const expiresAt = addMinutes(new Date(), 15);

		const rec = await this.spaceLinkCodesRepository.createSpaceLinkCode({
			space: { connect: { id: spaceId } },
			createdBy: { connect: { id: createdByUserId } },
			hashCode,
			expiresAt,
			maxUses: 1,
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

		const link = await this.spaceLinkCodesRepository.findById(id);
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
	async markUsed(id: string) {
		const updated = await this.spaceLinkCodesRepository.incrementUsedCount(id);

		if (updated.usedCount >= updated.maxUses && !updated.usedAt) {
			await this.spaceLinkCodesRepository.setUsedAt(id, new Date());
		}
	}
}
