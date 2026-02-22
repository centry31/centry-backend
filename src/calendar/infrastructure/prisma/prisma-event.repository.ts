import type { Event } from 'calendar/domain/event.entity';

import type {
	EventRepository,
	ReminderPlanningState,
} from 'calendar/application/ports/event/event.repository';

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
	 * Ищет `detached`-замену для точного исходного инстанса.
	 */
	async findDetachedByOrigin(
		detachedFromEventId: string,
		detachedFromOccurrenceStart: Date,
	): Promise<Event | null> {
		const row = await this.prisma.event.findFirst({
			where: {
				detachedFromEventId,
				detachedFromOccurrenceStart,
			},
			include: { reminders: true },
		});
		return row ? toEventDomain(row, row.reminders) : null;
	}

	/**
	 * Пакетно загружает `detached` и группирует по id исходной серии.
	 */
	async findManyDetachedByOriginEventIds(eventIds: string[]): Promise<Record<string, Event[]>> {
		if (eventIds.length === 0) {
			return {};
		}

		const rows = await this.prisma.event.findMany({
			where: {
				detachedFromEventId: { in: eventIds },
			},
			include: { reminders: true },
		});

		const grouped: Record<string, Event[]> = {};
		for (const row of rows) {
			if (!row.detachedFromEventId) {
				continue;
			}

			if (!grouped[row.detachedFromEventId]) {
				grouped[row.detachedFromEventId] = [];
			}
			grouped[row.detachedFromEventId].push(toEventDomain(row, row.reminders));
		}

		return grouped;
	}

	/**
	 * Загружает все `detached`-события одной исходной серии.
	 */
	async findManyDetachedByOriginEventId(eventId: string): Promise<Event[]> {
		const rows = await this.prisma.event.findMany({
			where: { detachedFromEventId: eventId },
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
					detachedFromEventId: dataEvent.detachedFromEventId,
					detachedFromOccurrenceStart: dataEvent.detachedFromOccurrenceStart,
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
	 * Вспомогательное batch-удаление.
	 */
	async deleteByIds(ids: string[]): Promise<void> {
		if (ids.length === 0) {
			return;
		}

		await this.prisma.event.deleteMany({ where: { id: { in: ids } } });
	}

	/**
	 * Удаляет все `detached` одной исходной серии.
	 *
	 * Возвращает удаленные сущности, чтобы вызвать unschedule их reminders.
	 */
	async deleteDetachedByOriginEventId(eventId: string): Promise<Event[]> {
		const rows = await this.prisma.event.findMany({
			where: { detachedFromEventId: eventId },
			include: { reminders: true },
		});
		if (rows.length === 0) {
			return [];
		}

		await this.prisma.event.deleteMany({
			where: {
				id: { in: rows.map((row) => row.id) },
			},
		});

		return rows.map((row) => toEventDomain(row, row.reminders));
	}

	/**
	 * Удаляет `detached` для одного исходного слота.
	 */
	async deleteDetachedByOrigin(
		detachedFromEventId: string,
		detachedFromOccurrenceStart: Date,
	): Promise<Event | null> {
		const row = await this.prisma.event.findFirst({
			where: {
				detachedFromEventId,
				detachedFromOccurrenceStart,
			},
			include: { reminders: true },
		});
		if (!row) {
			return null;
		}

		await this.prisma.event.delete({ where: { id: row.id } });
		return toEventDomain(row, row.reminders);
	}

	/**
	 * Перепривязывает `detached`-ссылки после разделения серии со старого корня на новый хвост.
	 */
	async reassignDetachedAfterOccurrence(
		sourceEventId: string,
		targetEventId: string,
		fromOccurrenceStart: Date,
	): Promise<string[]> {
		const rows = await this.prisma.event.findMany({
			where: {
				detachedFromEventId: sourceEventId,
				detachedFromOccurrenceStart: { gte: fromOccurrenceStart },
			},
			select: { id: true },
		});
		if (rows.length === 0) {
			return [];
		}

		const movedIds = rows.map((row) => row.id);
		await this.prisma.event.updateMany({
			where: { id: { in: movedIds } },
			data: { detachedFromEventId: targetEventId },
		});
		return movedIds;
	}

	/**
	 * Возвращает текущее состояние планирования reminder для процессора очереди.
	 */
	async findReminderPlanningState(reminderId: string): Promise<ReminderPlanningState | null> {
		const row = await this.prisma.eventReminder.findUnique({
			where: { id: reminderId },
			select: {
				id: true,
				eventId: true,
				offsetMinutes: true,
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
			nextOccurrenceStart: row.nextOccurrenceStart,
			scheduledAt: row.scheduledAt,
		};
	}

	/**
	 * Сохраняет поля состояния планирования reminder.
	 */
	async updateReminderPlanningState(
		reminderId: string,
		data: {
			nextOccurrenceStart: Date | null;
			scheduledAt: Date | null;
		},
	): Promise<void> {
		await this.prisma.eventReminder.updateMany({
			where: { id: reminderId },
			data: {
				nextOccurrenceStart: data.nextOccurrenceStart,
				scheduledAt: data.scheduledAt,
			},
		});
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
