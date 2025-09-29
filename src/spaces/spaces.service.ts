import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space-dto';

// TODO: mb add SpaceGuardOwner?
@Injectable()
export class SpacesService {
	constructor(private readonly prismaService: PrismaService) {}

	/**
	 * Получает всех участников пространства.
	 * */
	private async listMembers(spaceId: string) {
		return this.prismaService.user.findMany({
			where: { SpaceMember: { some: { spaceId } } },
		});
	}

	/**
	 * Создает пространство для пользователя.
	 * */
	async createSpace(createSpaceDto: CreateSpaceDto, userId: string) {
		const { name, description } = createSpaceDto;

		return this.prismaService.space.create({
			data: {
				name,
				description,
				owner: { connect: { id: userId } },
				SpaceMember: {
					create: {
						user: { connect: { id: userId } },
					},
				},
			},
		});
	}

	/**
	 * Получает все пространства пользователя, в которых он состоит.
	 * */
	async getPersonalUserSpaces(userId: string) {
		return this.prismaService.space.findMany({
			where: { SpaceMember: { some: { userId } } },
		});
	}

	/**
	 * Получает всех участников пространства.
	 * */
	async getSpaceMembers(spaceId: string) {
		return this.listMembers(spaceId);
	}

	/**
	 * Проверяет, что у пространства есть привязанные и активные тг чаты
	 * */
	async hasActiveTgChats(spaceId: string): Promise<boolean> {
		const spaceTgChats = await this.prismaService.space.findFirst({
			where: { id: spaceId, SpaceTgChat: { some: { isActive: true } } },
			select: { id: true },
		});
		return Boolean(spaceTgChats);
	}

	/**
	 * Получает пространство по id.
	 * */
	async getSpace(spaceId: string) {
		const [space, hasTg] = await Promise.all([
			this.prismaService.space.findFirst({
				where: { id: spaceId },
			}),
			this.hasActiveTgChats(spaceId),
		]);

		if (!space) return null;

		return {
			...space,
			hasActiveTgChats: hasTg, // флаг для фронта
		};
	}

	async updateSpaceInfo(updateSpaceDto: UpdateSpaceDto, spaceId: string) {
		return this.prismaService.space.update({
			where: { id: spaceId },
			data: {
				name: updateSpaceDto.name,
				description: updateSpaceDto.description,
			},
		});
	}

	async deleteSpace(spaceId: string) {
		return this.prismaService.space.delete({ where: { id: spaceId } });
	}

	/**
	 * Выход пользователя из пространства.
	 * Ограничения:
	 *  - владелец не может покинуть пространство (должен сначала передать владение или удалить пространство)
	 */
	async leaveSpace(spaceId: string, userId: string) {
		// Проверяем, что пользователь состоит в пространстве
		const membership = await this.prismaService.spaceMember.findFirst({
			where: { spaceId, userId },
			select: { userId: true },
		});
		if (!membership) {
			throw new HttpException('Вы не пользователь этого пространства', HttpStatus.NOT_FOUND);
		}

		// Проверяем, не является ли пользователь владельцем пространства
		const space = await this.prismaService.space.findFirst({
			where: { id: spaceId },
		});
		if (!space) {
			throw new HttpException('Пространство не найдено', HttpStatus.NOT_FOUND);
		}
		if (space.ownerID === userId) {
			throw new HttpException(
				'Владелец пространства не может его покинуть',
				HttpStatus.CONFLICT,
			);
		}

		const result = await this.prismaService.spaceMember.deleteMany({
			where: { spaceId, userId },
		});

		if (result.count === 0) {
			throw new HttpException('Участник пространства не найден', HttpStatus.NOT_FOUND);
		}
	}
}
