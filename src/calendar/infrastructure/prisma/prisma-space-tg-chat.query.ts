import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import type { SpaceTgChatQuery } from 'spaces';

@Injectable()
export class PrismaSpaceTgChatQuery implements SpaceTgChatQuery {
	constructor(private readonly prisma: PrismaService) {}

	async hasBySpaceId(spaceId: string): Promise<boolean> {
		const row = await this.prisma.spaceTgChat.findFirst({
			where: { spaceId },
			select: { id: true },
		});
		return !!row;
	}
}
