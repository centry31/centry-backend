import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { MagicLink, Prisma, User } from '@prisma/client';

@Injectable()
export class MagicLinksRepository {
	constructor(private readonly prismaService: PrismaService) {}

	create(data: Prisma.MagicLinkCreateInput): Promise<MagicLink> {
		return this.prismaService.magicLink.create({ data });
	}

	findMagicLinkById(id: string): Promise<MagicLink | null> {
		return this.prismaService.magicLink.findFirst({ where: { id } });
	}

	markMagicLinkUsed(id: string, usedAt: Date): Promise<MagicLink> {
		return this.prismaService.magicLink.update({
			where: { id },
			data: { usedAt },
		});
	}
}
