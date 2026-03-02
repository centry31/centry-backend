import type { Event } from 'calendar/domain/event.entity';

import type { EventRepository } from 'calendar/application/ports/event/event.repository';

import { toEventDomain, toEventPersistence, toReminderPersistence } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

/**
 * Prisma-реализация persistence-слоя агрегата события.
 */
@Injectable()
export class PrismaEventRepository implements EventRepository {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Возвращает событие по id вместе с reminders.
	 */
	async findById(id: string): Promise<Event | null> {
		const row = await this.prisma.event.findUnique({
			where: { id },
			include: { reminders: true },
		});
		return row ? toEventDomain(row, row.reminders) : null;
	}

	/**
	 * Возвращает событие по id в рамках space.
	 */
	async findByIdWithSpaceId(id: string, spaceId: string): Promise<Event | null> {
		const row = await this.prisma.event.findFirst({
			where: { id, spaceId },
			include: { reminders: true },
		});
		return row ? toEventDomain(row, row.reminders) : null;
	}

	/**
	 * Возвращает все события пространства (корневые и `detached`).
	 */
	async findManyBySpaceId(spaceId: string): Promise<Event[]> {
		const rows = await this.prisma.event.findMany({
			where: { spaceId },
			include: { reminders: true },
		});
		return rows.map((row) => toEventDomain(row, row.reminders));
	}

	/**
	 * Транзакционно создает событие и reminders.
	 */
	async create(event: Event): Promise<Event> {
		const dataEvent = toEventPersistence(event);

		await this.prisma.$transaction(async (tx) => {
			await tx.event.create({ data: dataEvent });

			if (event.reminders.length) {
				await tx.eventReminder.createMany({
					data: event.reminders.map((reminder) => toReminderPersistence(reminder)),
					skipDuplicates: true,
				});
			}
		});

		const row = await this.prisma.event.findUnique({
			where: { id: event.id },
			include: { reminders: true },
		});
		if (!row) {
			return null;
		}

		return toEventDomain(row, row.reminders);
	}

	/**
	 * Полная замена event/reminder строк.
	 *
	 * Для reminders стратегия "удалить все и вставить заново",
	 * чтобы соответствовать детерминированной семантике полного обновления в use-case.
	 */
	async update(event: Event): Promise<void> {
		const existing = await this.prisma.event.findUnique({
			where: { id: event.id },
			include: { reminders: true },
		});
		if (!existing) {
			return;
		}

		const remindersToDeleteIds = existing.reminders.map((reminder) => reminder.id);
		const dataEvent = toEventPersistence(event);

		await this.prisma.$transaction(async (tx) => {
			if (remindersToDeleteIds.length) {
				await tx.eventReminder.deleteMany({
					where: { id: { in: remindersToDeleteIds } },
				});
			}

			await tx.event.update({
				where: { id: event.id },
				data: {
					title: dataEvent.title,
					description: dataEvent.description,
					start: dataEvent.start,
					rrule: dataEvent.rrule,
					timeZone: dataEvent.timeZone,
					duration: dataEvent.duration,
				},
			});

			if (event.reminders.length) {
				await tx.eventReminder.createMany({
					data: event.reminders.map((reminder) => toReminderPersistence(reminder)),
					skipDuplicates: true,
				});
			}
		});
	}

	/**
	 * Удаляет корневое событие в рамках пространства.
	 */
	async delete(id: string, spaceId: string): Promise<void> {
		await this.prisma.event.deleteMany({ where: { id, spaceId } });
	}

	/**
	 * Возвращает `true`, если `scheduledAt` у reminder не `null`.
	 */
	async isReminderPending(reminderId: string): Promise<boolean> {
		const row = await this.prisma.eventReminder.findFirst({
			where: { id: reminderId, scheduledAt: { not: null } },
			select: { id: true },
		});

		return Boolean(row);
	}

	/**
	 * Помечает reminder как отправленный.
	 */
	async markReminderSent(reminderId: string, sentAt: Date = new Date()): Promise<void> {
		await this.prisma.eventReminder.updateMany({
			where: { id: reminderId },
			data: { sentAt },
		});
	}
}
