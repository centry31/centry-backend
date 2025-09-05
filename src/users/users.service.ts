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
}
