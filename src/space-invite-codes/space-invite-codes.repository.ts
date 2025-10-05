import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import type { Prisma, SpaceInviteCode } from '@prisma/client';

@Injectable()
export class SpaceInviteCodesRepository {
	constructor(private readonly prismaService: PrismaService) {}

	createInviteCode(data: Prisma.SpaceInviteCodeCreateInput): Promise<SpaceInviteCode> {
		return this.prismaService.spaceInviteCode.create({ data });
	}

	findInviteCodeByCode(code: string): Promise<SpaceInviteCode | null> {
		return this.prismaService.spaceInviteCode.findUnique({ where: { code } });
	}

	incrementUsedCount(code: string): Promise<SpaceInviteCode> {
		return this.prismaService.spaceInviteCode.update({
			where: { code },
			data: { usedCount: { increment: 1 } },
		});
	}

	markUsedAt(code: string, usedAt: Date): Promise<SpaceInviteCode> {
		return this.prismaService.spaceInviteCode.update({
			where: { code },
			data: { usedAt },
		});
	}

	deleteInviteCode(spaceId: string, code: string): Promise<SpaceInviteCode> {
		return this.prismaService.spaceInviteCode.delete({ where: { spaceId, code } });
	}

	findActiveInviteCodes(spaceId: string): Promise<SpaceInviteCode[]> {
		return this.prismaService.spaceInviteCode.findMany({
			where: {
				spaceId,
				usedAt: null,
				expiresAt: { gt: new Date() },
			},
		});
	}
}
