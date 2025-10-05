import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import type { User, Prisma, Space } from '@prisma/client';

@Injectable()
export class UsersRepository {
	constructor(private readonly prisma: PrismaService) {}

	createUser(data: Prisma.UserCreateInput): Promise<User> {
		return this.prisma.user.create({ data });
	}

	findById(id: string): Promise<User | null> {
		return this.prisma.user.findFirst({ where: { id } });
	}

	findByTelegramId(tgId: bigint): Promise<User | null> {
		return this.prisma.user.findFirst({ where: { tgId } });
	}

	findSpacesByUserId(userId: string): Promise<Space[]> {
		return this.prisma.space.findMany({
			where: {
				OR: [{ ownerID: userId }, { SpaceMember: { some: { userId } } }],
			},
		});
	}
}
