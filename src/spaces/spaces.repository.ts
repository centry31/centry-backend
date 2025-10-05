import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class SpacesRepository {
	constructor(private readonly prismaService: PrismaService) {}

	createSpace(data: Prisma.SpaceCreateInput) {
		return this.prismaService.space.create({ data });
	}

	findManyByUserId(userId: string) {
		return this.prismaService.space.findMany({
			where: { SpaceMember: { some: { userId } } },
		});
	}

	findById(spaceId: string) {
		return this.prismaService.space.findFirst({ where: { id: spaceId } });
	}

	update(spaceId: string, data: Prisma.SpaceUpdateInput) {
		return this.prismaService.space.update({ where: { id: spaceId }, data });
	}

	delete(spaceId: string) {
		return this.prismaService.space.delete({ where: { id: spaceId } });
	}

	findMembers(spaceId: string) {
		return this.prismaService.user.findMany({
			where: { SpaceMember: { some: { spaceId } } },
		});
	}

	findMembership(spaceId: string, userId: string) {
		return this.prismaService.spaceMember.findFirst({
			where: { spaceId, userId },
			select: { userId: true },
		});
	}

	deleteMembership(spaceId: string, userId: string) {
		return this.prismaService.spaceMember.deleteMany({ where: { spaceId, userId } });
	}

	hasActiveTgChats(spaceId: string) {
		return this.prismaService.space.findFirst({
			where: { id: spaceId, SpaceTgChat: { some: { isActive: true } } },
			select: { id: true },
		});
	}
}
