import type { Event } from 'calendar/domain/event.entity';

import type {
	EventRepository,
	ReminderPlanningState,
} from 'calendar/application/ports/event/event.repository';

import { toEventDomain, toEventPersistence, toReminderPersistence } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaEventRepository implements EventRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string): Promise<Event | null> {
		const row = await this.prisma.event.findUnique({
			where: { id },
			include: { reminders: true },
		});
		return row ? toEventDomain(row, row.reminders) : null;
	}

	async findByIdWithSpaceId(id: string, spaceId: string): Promise<Event | null> {
		const row = await this.prisma.event.findUnique({
			where: { id, spaceId },
			include: { reminders: true },
		});
		return row ? toEventDomain(row, row.reminders) : null;
	}

	async findManyBySpaceId(spaceId: string): Promise<Event[]> {
		const rows = await this.prisma.event.findMany({
			where: { spaceId },
			include: { reminders: true },
		});
		return rows.map((row) => toEventDomain(row, row.reminders));
	}

	async create(event: Event): Promise<Event> {
		const dataEvent = toEventPersistence(event);

		await this.prisma.$transaction(async (tx) => {
			await tx.event.create({ data: dataEvent });

			if (event.reminders.length) {
				await tx.eventReminder.createMany({
					data: event.reminders.map((r) => toReminderPersistence(r)),
					skipDuplicates: true,
				});
			}
		});

		const row = await this.prisma.event.findUnique({
			where: { id: event.id },
			include: { reminders: true },
		});
		if (!row) return null;
		return toEventDomain(row, row.reminders);
	}

	async update(event: Event): Promise<void> {
		const existing = await this.prisma.event.findUnique({
			where: { id: event.id },
			include: { reminders: true },
		});

		const remindersToDeleteIds = existing.reminders.map((r) => r.id);
		const dataEvent = toEventPersistence(event);

		await this.prisma.$transaction(async (tx) => {
			if (remindersToDeleteIds.length) {
				await tx.eventReminder.deleteMany({ where: { id: { in: remindersToDeleteIds } } });
			}

			await tx.event.update({
				where: { id: event.id },
				data: {
					title: dataEvent.title,
					description: dataEvent.description,
					start: dataEvent.start,
					repeatUntil: dataEvent.repeatUntil,
					duration: dataEvent.duration,
					frequency: dataEvent.frequency,
				},
			});

			if (event.reminders.length) {
				await tx.eventReminder.createMany({
					data: event.reminders.map((r) => toReminderPersistence(r)),
					skipDuplicates: true,
				});
			}
		});
	}

	async delete(id: string, spaceId: string): Promise<void> {
		await this.prisma.event.delete({ where: { id, spaceId } });
		// Напоминания удаляются автоматически за счет каскадной связи в Prisma.
	}

	async findReminderPlanningState(reminderId: string): Promise<ReminderPlanningState | null> {
		const row = await this.prisma.eventReminder.findUnique({
			where: { id: reminderId },
			select: {
				id: true,
				eventId: true,
				offsetMinutes: true,
				nextOrderIndex: true,
				nextOccurrenceStart: true,
				scheduledAt: true,
				event: {
					select: {
						spaceId: true,
						title: true,
					},
				},
			},
		});
		if (!row) {
			return null;
		}

		return {
			reminderId: row.id,
			eventId: row.eventId,
			eventTitle: row.event.title,
			spaceId: row.event.spaceId,
			offsetMinutes: row.offsetMinutes,
			nextOrderIndex: row.nextOrderIndex,
			nextOccurrenceStart: row.nextOccurrenceStart,
			scheduledAt: row.scheduledAt,
		};
	}

	async updateReminderPlanningState(
		reminderId: string,
		data: {
			nextOrderIndex: number | null;
			nextOccurrenceStart: Date | null;
			scheduledAt: Date | null;
		},
	): Promise<void> {
		await this.prisma.eventReminder.updateMany({
			where: { id: reminderId },
			data: {
				nextOrderIndex: data.nextOrderIndex,
				nextOccurrenceStart: data.nextOccurrenceStart,
				scheduledAt: data.scheduledAt,
			},
		});
	}

	async isReminderPending(reminderId: string): Promise<boolean> {
		const row = await this.prisma.eventReminder.findFirst({
			where: { id: reminderId, scheduledAt: { not: null } },
			select: { id: true },
		});

		return !!row;
	}

	async markReminderSent(reminderId: string, sentAt: Date = new Date()): Promise<void> {
		await this.prisma.eventReminder.updateMany({
			where: { id: reminderId },
			data: { sentAt },
		});
	}
}
