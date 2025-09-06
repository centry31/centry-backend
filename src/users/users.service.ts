import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
	constructor(private readonly prismaService: PrismaService) {}

	private async createUser(createUserDto: CreateUserDto) {
		const { chatId, tgId, displayName, username } = createUserDto;

		return this.prismaService.user.create({
			data: {
				chatId,
				tgId,
				displayName,
				username,
			},
		});
	}

	async findUserById(id: string) {
		return this.prismaService.user.findFirst({ where: { id } });
	}

	async findUserByTelegramId(tgId: bigint) {
		return this.prismaService.user.findFirst({ where: { tgId } });
	}

	async registration(createUserDto: CreateUserDto) {
		const userCandidate = await this.prismaService.user.findFirst({
			where: { tgId: createUserDto.tgId },
		});

		if (userCandidate) {
			throw new HttpException(
				'Пользователь с таким телеграм аккаунтом уже зарегистрирован',
				HttpStatus.BAD_REQUEST,
			);
		}

		return this.createUser(createUserDto);
	}

	async getUserSpacesIDs(id: string) {
		const spaces = await this.prismaService.space.findMany({
			where: { OR: [{ ownerID: id }, { SpaceMember: { some: { userId: id } } }] },
		});

		return spaces.map((space) => space.id);
	}
}
