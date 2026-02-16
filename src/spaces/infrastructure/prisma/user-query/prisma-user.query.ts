import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import type { UserQuery } from 'users';

@Injectable()
export class PrismaUserQuery implements UserQuery {
	constructor(private prisma: PrismaService) {}

	async findByIds(ids: string[]) {
		const users = await this.prisma.user.findMany({
			where: { id: { in: ids } },
			select: { id: true, username: true, displayName: true },
		});
		return users;
	}
}
