import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
	constructor(private readonly usersRepository: UsersRepository) {}

	private async createUser(createUserDto: CreateUserDto) {
		const { chatId, tgId, displayName, username } = createUserDto;

		return this.usersRepository.createUser({
			chatId,
			tgId,
			displayName,
			username,
		});
	}

	async getUserById(id: string) {
		return this.usersRepository.findById(id);
	}

	async getUserByTelegramId(tgId: bigint) {
		return this.usersRepository.findByTelegramId(tgId);
	}

	async registration(createUserDto: CreateUserDto) {
		const userCandidate = await this.usersRepository.findByTelegramId(createUserDto.tgId);

		if (userCandidate) {
			throw new HttpException(
				'Пользователь с таким телеграм аккаунтом уже зарегистрирован',
				HttpStatus.BAD_REQUEST,
			);
		}

		return this.createUser(createUserDto);
	}

	async getUserSpacesIDs(id: string) {
		const spaces = await this.usersRepository.findSpacesByUserId(id);
		return spaces.map((s) => s.id);
	}
}
