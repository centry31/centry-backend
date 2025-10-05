import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import type { Prisma, SpaceLinkCode } from '@prisma/client';

@Injectable()
export class SpaceLinkCodesRepository {
	constructor(private readonly prismaService: PrismaService) {}

	createSpaceLinkCode(data: Prisma.SpaceLinkCodeCreateInput): Promise<Pick<SpaceLinkCode, 'id'>> {
		return this.prismaService.spaceLinkCode.create({
			data,
			select: { id: true },
		});
	}

	findById(id: string): Promise<SpaceLinkCode | null> {
		return this.prismaService.spaceLinkCode.findUnique({ where: { id } });
	}

	incrementUsedCount(id: string): Promise<SpaceLinkCode> {
		return this.prismaService.spaceLinkCode.update({
			where: { id },
			data: { usedCount: { increment: 1 } },
		});
	}

	setUsedAt(id: string, usedAt: Date): Promise<SpaceLinkCode> {
		return this.prismaService.spaceLinkCode.update({
			where: { id },
			data: { usedAt },
		});
	}
}
