import type { Space } from '@spaces/domain/space.entity';

import type { SpaceRepository } from '@spaces/application/ports/space/space.repository';

import { toSpaceDomain, toSpacePersistence } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaSpaceRepository implements SpaceRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string): Promise<Space | null> {
		const row = await this.prisma.space.findUnique({
			where: { id },
		});
		return row ? toSpaceDomain(row) : null;
	}

	async findManyByOwnerId(ownerId: string): Promise<Space[]> {
		const rows = await this.prisma.space.findMany({
			where: { ownerId },
		});
		return rows.map((row) => toSpaceDomain(row));
	}

	async findManyByMembershipUserId(userId: string): Promise<Space[]> {
		const rows = await this.prisma.space.findMany({
			where: { spaceMembers: { some: { userId } } },
		});
		return rows.map((row) => toSpaceDomain(row));
	}

	async create(space: Space): Promise<Space> {
		const data = toSpacePersistence(space);
		const row = await this.prisma.space.create({ data });
		return toSpaceDomain(row);
	}

	async updateInfo(space: Space): Promise<void> {
		const data = toSpacePersistence(space);
		await this.prisma.space.update({
			where: { id: space.id },
			data,
		});
	}

	async delete(spaceId: string): Promise<void> {
		await this.prisma.space.delete({ where: { id: spaceId } });
	}
}
