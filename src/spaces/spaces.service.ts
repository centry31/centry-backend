import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { CreateSpaceDto } from 'spaces/dto/create-space.dto';

@Injectable()
export class SpacesService {
	constructor(private readonly prismaService: PrismaService) {}

	/**
	 * Создает пространство для пользователя
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
	 * Получает все пространства пользователя, в которых он состоит
	 * */
	async getPersonalUserSpaces(userId: string) {
		return this.prismaService.space.findMany({ where: { SpaceMember: { some: { userId } } } });
	}
}
