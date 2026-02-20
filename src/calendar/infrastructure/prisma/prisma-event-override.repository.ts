import type { EventOverride } from 'calendar/domain/event-override.entity';

import type { EventOverrideRepository } from 'calendar/application/ports/event-override/event-override.repository';

import { toEventOverrideDomain } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaEventOverrideRepository implements EventOverrideRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findByEventIds(eventIds: string[]): Promise<Record<string, EventOverride[]>> {
		if (eventIds.length === 0) {
			return {};
		}

		const rows = await this.prisma.eventOverride.findMany({
			where: { eventId: { in: eventIds } },
			orderBy: { orderIndex: 'asc' },
		});

		const grouped: Record<string, EventOverride[]> = {};
		for (const row of rows) {
			if (!grouped[row.eventId]) {
				grouped[row.eventId] = [];
			}
			grouped[row.eventId].push(toEventOverrideDomain(row));
		}

		return grouped;
	}

	async findByEventId(eventId: string): Promise<EventOverride[]> {
		const rows = await this.prisma.eventOverride.findMany({
			where: { eventId },
			orderBy: { orderIndex: 'asc' },
		});
		return rows.map((row) => toEventOverrideDomain(row));
	}

	async findByEventIdAndOrderIndex(
		eventId: string,
		orderIndex: number,
	): Promise<EventOverride | null> {
		const row = await this.prisma.eventOverride.findFirst({ where: { eventId, orderIndex } });
		if (!row) return null;
		return toEventOverrideDomain(row);
	}

	async upsert(cmd: EventOverride): Promise<void> {
		await this.prisma.eventOverride.upsert({
			where: {
				eventId_orderIndex: {
					eventId: cmd.eventId,
					orderIndex: cmd.orderIndex,
				},
			},
			create: {
				eventId: cmd.eventId,
				orderIndex: cmd.orderIndex,
				offset: cmd.offset,
				isDeleted: cmd.isDeleted,
				isOffsetOnce: cmd.isOffsetOnce,
			},
			update: {
				offset: cmd.offset,
				isDeleted: cmd.isDeleted,
				isOffsetOnce: cmd.isOffsetOnce,
			},
		});
	}

	async deleteAfterOrder(eventId: string, orderIndex: number): Promise<void> {
		await this.prisma.eventOverride.deleteMany({
			where: {
				eventId,
				orderIndex: {
					gt: orderIndex,
				},
			},
		});
	}

	async replaceFutureFromOrder(
		eventId: string,
		orderIndex: number,
		offset: number,
	): Promise<void> {
		await this.prisma.$transaction(async (tx) => {
			await tx.eventOverride.deleteMany({
				where: {
					eventId,
					orderIndex: {
						gt: orderIndex,
					},
				},
			});

			await tx.eventOverride.upsert({
				where: {
					eventId_orderIndex: {
						eventId,
						orderIndex,
					},
				},
				create: {
					eventId,
					orderIndex,
					offset,
					isDeleted: false,
					isOffsetOnce: false,
				},
				update: {
					offset,
					isDeleted: false,
					isOffsetOnce: false,
				},
			});
		});
	}
}
