import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

import type { Prisma, Event, EventReminder } from '@prisma/client';

@Injectable()
export class EventRemindersRepository {
	constructor(private readonly prismaService: PrismaService) {}

	findEventById(eventId: string): Promise<Event | null> {
		return this.prismaService.event.findUnique({ where: { id: eventId } });
	}

	createReminder(data: Prisma.EventReminderCreateInput): Promise<EventReminder> {
		return this.prismaService.eventReminder.create({ data });
	}

	findManyByEventId(eventId: string): Promise<EventReminder[]> {
		return this.prismaService.eventReminder.findMany({ where: { eventId } });
	}

	deleteById(id: string) {
		return this.prismaService.eventReminder.delete({ where: { id } });
	}

	deleteManyByEventId(eventId: string) {
		return this.prismaService.eventReminder.deleteMany({ where: { eventId } });
	}
}
