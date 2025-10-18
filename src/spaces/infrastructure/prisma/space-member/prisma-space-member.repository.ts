import type { SpaceMember } from '@spaces/domain/space-member.entity';

import type { SpaceMemberRepository } from '@spaces/application/ports/space-member/space-member.repository';

import { toDomain } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaSpaceMemberRepository implements SpaceMemberRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findOne(userId: string, spaceId: string): Promise<SpaceMember | null> {
		const row = await this.prisma.spaceMember.findUnique({
			where: { userId_spaceId: { userId, spaceId } },
		});
		return row ? toDomain(row) : null;
	}

	async findManyBySpaceId(spaceId: string): Promise<SpaceMember[]> {
		const rows = await this.prisma.spaceMember.findMany({ where: { spaceId } });
		return rows.map((r) => toDomain(r));
	}

	async add(member: SpaceMember): Promise<void> {
		await this.prisma.spaceMember.create({
			data: {
				userId: member.userId,
				spaceId: member.spaceId,
			},
		});
	}

	async remove(userId: string, spaceId: string): Promise<void> {
		await this.prisma.spaceMember.delete({
			where: { userId_spaceId: { userId, spaceId } },
		});
	}
}
