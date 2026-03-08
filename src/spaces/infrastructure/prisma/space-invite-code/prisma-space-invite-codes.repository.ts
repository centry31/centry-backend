import type { SpaceInviteCode } from '@spaces/domain/space-invite-code.entity';

import type { SpaceInviteCodeRepository } from '@spaces/application/ports/space-invite-code/space-invite-code.repository';

import { toCreatePersistence, toDomain, toPersistence } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaSpaceInviteCodesRepository implements SpaceInviteCodeRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(invite: SpaceInviteCode): Promise<SpaceInviteCode> {
		const data = toCreatePersistence(invite);
		const row = await this.prisma.spaceInviteCode.create({ data });
		return toDomain(row);
	}

	async update(invite: SpaceInviteCode): Promise<void> {
		const data = toPersistence(invite);
		await this.prisma.spaceInviteCode.update({
			where: { spaceId: data.spaceId, code: data.code },
			data,
		});
	}

	async delete(spaceId: string, code: string): Promise<void> {
		await this.prisma.spaceInviteCode.delete({ where: { spaceId, code } });
	}

	async findOneByCode(code: string): Promise<SpaceInviteCode | null> {
		const row = await this.prisma.spaceInviteCode.findUnique({ where: { code } });
		return row ? toDomain(row) : null;
	}

	async findBySpaceId(spaceId: string): Promise<SpaceInviteCode[]> {
		const rows = await this.prisma.spaceInviteCode.findMany({
			where: { spaceId },
		});

		if (!rows.length) return [];
		return rows.map((row) => toDomain(row));
	}
}
