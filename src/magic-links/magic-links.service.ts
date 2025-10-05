import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateMagicLinkDto } from './dto/create-magic-link.dto';

import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MagicLinksRepository } from './magic-links.repository';
import { UsersRepository } from 'users/users.repository';

function addMinutes(date: Date, minutes: number): Date {
	return new Date(date.getTime() + minutes * 60 * 1000);
}

@Injectable()
export class MagicLinksService {
	constructor(
		private readonly magicLinksRepository: MagicLinksRepository,
		private readonly usersRepository: UsersRepository,
	) {}

	/**
	 * Создает ссылку для логина пользователя и устанавливает ее в бд
	 *
	 * @param createMagicLinkDto - данные для создания ссылки и записи
	 * @return string - код ссылки
	 * */
	async createMagicLink(createMagicLinkDto: CreateMagicLinkDto) {
		const rawCode = randomBytes(32).toString('hex');

		const { userId } = createMagicLinkDto;

		const hashCode = await bcrypt.hash(rawCode, 10);
		const expiresAt = addMinutes(new Date(), 10);

		const createdLink = await this.magicLinksRepository.create({
			user: { connect: { id: userId } },
			hashCode,
			expiresAt,
		});

		return `${createdLink.id}.${rawCode}`;
	}

	/**
	 * Обменивает авторизационную ссылку на данные о пользователе
	 *
	 * @param code - код для авторизации
	 * */
	async exchangeMagicLink(code: string) {
		if (!code || !code.includes('.')) {
			throw new HttpException('Некорректный формат кода', HttpStatus.BAD_REQUEST);
		}

		const [id, secret] = code.split('.', 2);
		if (!id || !secret) {
			throw new HttpException('Некорректный формат кода', HttpStatus.BAD_REQUEST);
		}

		const magicLink = await this.magicLinksRepository.findMagicLinkById(id);
		if (!magicLink) {
			throw new HttpException('Авторизационная ссылка не найдена', HttpStatus.NOT_FOUND);
		}
		if (magicLink.usedAt) {
			throw new HttpException('Авторизационная ссылка уже использована', HttpStatus.GONE);
		}
		if (magicLink.expiresAt < new Date()) {
			throw new HttpException('Авторизационная ссылка устарела', HttpStatus.GONE);
		}

		const ok = await bcrypt.compare(secret, magicLink.hashCode);

		if (!ok) {
			throw new HttpException('Авторизационная ссылка не найдена', HttpStatus.NOT_FOUND);
		}

		await this.magicLinksRepository.markMagicLinkUsed(magicLink.id, new Date());

		const user = await this.usersRepository.findById(magicLink.userId);
		if (!user) {
			throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
		}

		// TODO: надо бы контролировать, что я возвращаю из бд?
		return user;
	}
}
