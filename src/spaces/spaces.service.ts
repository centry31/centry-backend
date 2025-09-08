import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { CreateSpaceDto } from 'spaces/dto/create-space.dto';
import { UpdateSpaceDto } from 'spaces/dto/update-space-dto';

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
	 * Получает пространство по id.
	 * */
	async getSpace(spaceId: string) {
		return this.prismaService.space.findFirst({
			where: { id: spaceId },
		});
	}

	async updateSpaceInfo(updateSpaceDto: UpdateSpaceDto, spaceId: string, userId: string) {
		const space = await this.prismaService.space.findFirst({ where: { id: spaceId } });

		if (space.ownerID != userId) {
			throw new HttpException(
				'У вас нет прав редактировать данное пространство',
				HttpStatus.FORBIDDEN,
			);
		}

		return this.prismaService.space.update({
			where: { id: spaceId },
			data: {
				name: updateSpaceDto.name,
				description: updateSpaceDto.description,
			},
		});
	}

	async deleteSpace(spaceId: string, userId: string) {
		const space = await this.prismaService.space.findFirst({ where: { id: spaceId } });

		if (space.ownerID != userId) {
			throw new HttpException(
				'У вас нет прав редактировать данное пространство',
				HttpStatus.FORBIDDEN,
			);
		}

		return this.prismaService.space.delete({ where: { id: spaceId } });
	}
}
