import type { Event } from 'calendar/domain/event.entity';

import type { EventRepository } from 'calendar/application/ports/event.repository';

import { toEventDomain, toEventPersistence, toReminderPersistence } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaEventRepository implements EventRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string): Promise<Event | null> {
		const row = await this.prisma.event.findUnique({
			where: { id },
		});
		return row ? toEventDomain(row) : null;
	}

	async findByIdWithReminders(id: string, spaceId: string): Promise<Event | null> {
		const row = await this.prisma.event.findUnique({
			where: { id, spaceId },
			include: {
				reminders: true,
			},
		});
		if (!row) return null;
		return toEventDomain(row, row.reminders ?? []);
	}

	async findManyBySpaceId(spaceId: string): Promise<Event[]> {
		const rows = await this.prisma.event.findMany({
			where: { spaceId },
			orderBy: { start: 'asc' },
		});
		return rows.map((r) => toEventDomain(r));
	}

	async findManyBySpaceIdWithReminders(spaceId: string): Promise<Event[]> {
		const rows = await this.prisma.event.findMany({
			where: { spaceId },
			include: {
				reminders: true,
			},
		});
		return rows.map((r) => toEventDomain(r, r.reminders ?? []));
	}

	async create(event: Event): Promise<Event> {
		const dataEvent = toEventPersistence(event);

		await this.prisma.$transaction(async (tx) => {
			await tx.event.create({ data: dataEvent });

			if (event.reminders.length) {
				await tx.eventReminder.createMany({
					data: event.reminders.map((r) => toReminderPersistence(r, event.id)),
					skipDuplicates: true,
				});
			}
		});

		const row = await this.prisma.event.findUnique({
			where: { id: event.id },
			include: { reminders: true },
		});
		if (!row) return null;
		return toEventDomain(row);
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
					end: dataEvent.end,
				},
			});

			if (event.reminders.length) {
				await tx.eventReminder.createMany({
					data: event.reminders.map((r) => toReminderPersistence(r, event.id)),
					skipDuplicates: true,
				});
			}
		});
	}

	async delete(id: string, spaceId: string): Promise<void> {
		await this.prisma.event.delete({ where: { id, spaceId } });
		// благодаря onDelete: Cascade на relation, reminders удалятся сами
	}
}
