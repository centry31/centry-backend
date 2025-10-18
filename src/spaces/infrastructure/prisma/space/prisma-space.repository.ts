import type { Space } from '@spaces/domain/space.entity';

import type { SpaceRepository } from '@spaces/application/ports/space/space.repository';

import { toDomain, toPersistence } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaSpaceRepository implements SpaceRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string): Promise<Space | null> {
		const row = await this.prisma.space.findUnique({ where: { id } });
		return row ? toDomain(row) : null;
	}

	async findManyByOwnerId(ownerId: string): Promise<Space[]> {
		const rows = await this.prisma.space.findMany({ where: { ownerID: ownerId } });
		return rows.map((r) => toDomain(r));
	}

	async create(space: Space): Promise<Space> {
		const data = toPersistence(space);
		const row = await this.prisma.space.create({ data });
		return toDomain(row);
	}

	async update(space: Space): Promise<void> {
		const data = toPersistence(space);
		await this.prisma.space.update({
			where: { id: space.id },
			data,
		});
	}

	async delete(spaceId: string): Promise<void> {
		await this.prisma.space.delete({ where: { id: spaceId } });
	}

	async findManyByMembershipUserId(userId: string): Promise<Space[]> {
		const rows = await this.prisma.space.findMany({
			where: { SpaceMember: { some: { userId } } },
		});
		return rows.map((r) => toDomain(r));
	}
}
