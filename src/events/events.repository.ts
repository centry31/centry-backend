import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class EventsRepository {
	constructor(private readonly prismaService: PrismaService) {}

	findManyBySpaceId(spaceId: string) {
		return this.prismaService.event.findMany({
			where: { spaceId },
			include: { reminders: true },
		});
	}

	createEvent(data: Prisma.EventCreateInput) {
		return this.prismaService.event.create({ data });
	}

	updateEventClearingReminders(
		where: { id: string; spaceId: string },
		data: Prisma.EventUpdateInput,
	) {
		return this.prismaService.event.update({
			where,
			data: {
				...data,
				reminders: { deleteMany: {} },
			},
		});
	}

	findByIdWithReminders(id: string) {
		return this.prismaService.event.findUnique({
			where: { id },
			include: { reminders: true },
		});
	}

	deleteByIdWithSpaceCheck(where: { id: string; spaceId: string }) {
		return this.prismaService.event.delete({ where });
	}
}
