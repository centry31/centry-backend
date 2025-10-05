import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space-dto';
import type { Space, User } from '@prisma/client';
import { SpacesRepository } from './spaces.repository';
import { UsersRepository } from 'users/users.repository';
import type { AccessType } from './types/access.type';

@Injectable()
export class SpacesService {
	constructor(
		private readonly spacesRepository: SpacesRepository,
		private readonly usersRepository: UsersRepository,
	) {}

	private async getUserAccess(space: Space, user: User): Promise<AccessType> {
		return space.ownerID === user.id ? 'owner' : 'member';
	}

	/**
	 * Проверяет, что у пространства есть привязанные и активные тг чаты
	 * */
	async getHasActiveTgChatsFlag(spaceId: string) {
		const spaceTgChats = await this.spacesRepository.hasActiveTgChats(spaceId);
		return Boolean(spaceTgChats);
	}

	async enrichHasActiveTgChats(space: Space) {
		const hasActiveTgChats = await this.getHasActiveTgChatsFlag(space.id);
		return { ...space, hasActiveTgChats };
	}

	async enrichAccess(space: Space, userId: string) {
		const user = await this.usersRepository.findById(userId);
		const access = await this.getUserAccess(space, user);
		return { ...space, access };
	}

	async enrich(space: Space, userId: string) {
		const enrichedTg = await this.enrichHasActiveTgChats(space);
		const enrichedAccess = await this.enrichAccess(enrichedTg, userId);
		return enrichedAccess;
	}

	async create(createSpaceDto: CreateSpaceDto, userId: string) {
		const { name, description } = createSpaceDto;
		return this.spacesRepository.createSpace({
			name,
			description,
			owner: { connect: { id: userId } },
			SpaceMember: { create: { user: { connect: { id: userId } } } },
		});
	}

	async getListByUserId(userId: string) {
		return this.spacesRepository.findManyByUserId(userId);
	}

	async getMembers(spaceId: string) {
		return this.spacesRepository.findMembers(spaceId);
	}

	async getOne(spaceId: string, userId?: string) {
		const space = await this.spacesRepository.findById(spaceId);
		if (!space) return null;
		return space;
	}

	async updateInfo(updateDto: UpdateSpaceDto, spaceId: string) {
		return this.spacesRepository.update(spaceId, {
			name: updateDto.name,
			description: updateDto.description,
		});
	}

	async delete(spaceId: string) {
		return this.spacesRepository.delete(spaceId);
	}

	/**
	 * Выход пользователя из пространства.
	 * Ограничения:
	 *  - владелец не может покинуть пространство (должен сначала передать владение или удалить пространство)
	 */
	async leave(spaceId: string, userId: string) {
		const membership = await this.spacesRepository.findMembership(spaceId, userId);
		if (!membership) {
			throw new HttpException('Вы не пользователь этого пространства', HttpStatus.NOT_FOUND);
		}

		const space = await this.spacesRepository.findById(spaceId);
		if (!space) {
			throw new HttpException('Пространство не найдено', HttpStatus.NOT_FOUND);
		}

		if (space.ownerID === userId) {
			throw new HttpException(
				'Владелец пространства не может его покинуть',
				HttpStatus.CONFLICT,
			);
		}

		const result = await this.spacesRepository.deleteMembership(spaceId, userId);
		if (result.count === 0) {
			throw new HttpException('Участник пространства не найден', HttpStatus.NOT_FOUND);
		}
	}
}
