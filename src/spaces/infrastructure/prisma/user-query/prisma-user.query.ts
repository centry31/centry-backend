import { PrismaService } from 'prisma.service';

import { UserQuery } from 'users';

export class PrismaUserQuery implements UserQuery {
	constructor(private prismaService: PrismaService) {}

	async findByIds(ids: string[]) {
		const users = await this.prismaService.user.findMany({
			where: { id: { in: ids } },
			select: { id: true, username: true, displayName: true },
		});
		return users;
	}
}
