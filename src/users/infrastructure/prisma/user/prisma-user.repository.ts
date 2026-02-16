import type { User } from '@users/domain/user.entity';

import type { UserRepository } from '@users/application/ports/user/user.repository';

import { toDomain, toPersistence } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
	constructor(private readonly prismaService: PrismaService) {}

	async findById(id: string): Promise<User | null> {
		const record = await this.prismaService.user.findUnique({ where: { id } });
		return record ? toDomain(record) : null;
	}

	async findByTgId(tgId: string): Promise<User | null> {
		const record = await this.prismaService.user.findUnique({ where: { tgId: BigInt(tgId) } });
		return record ? toDomain(record) : null;
	}

	async create(user: User): Promise<User> {
		const data = toPersistence(user);
		const record = await this.prismaService.user.create({ data });
		return toDomain(record);
	}

	async update(user: User): Promise<void> {
		const data = toPersistence(user);
		await this.prismaService.user.update({ where: { id: user.id }, data });
	}
}
