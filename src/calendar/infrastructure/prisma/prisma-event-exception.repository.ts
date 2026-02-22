import type { EventException } from 'calendar/domain/event-exception.entity';

import type { EventExceptionRepository } from 'calendar/application/ports/event-exception/event-exception.repository';

import { toEventExceptionDomain } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaEventExceptionRepository implements EventExceptionRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findByEventIds(eventIds: string[]): Promise<Record<string, EventException[]>> {
		if (eventIds.length === 0) {
			return {};
		}

		const rows = await this.prisma.eventException.findMany({
			where: { eventId: { in: eventIds } },
			orderBy: { occurrenceStart: 'asc' },
		});

		const grouped: Record<string, EventException[]> = {};
		for (const row of rows) {
			if (!grouped[row.eventId]) {
				grouped[row.eventId] = [];
			}
			grouped[row.eventId].push(toEventExceptionDomain(row));
		}

		return grouped;
	}

	async findByEventId(eventId: string): Promise<EventException[]> {
		const rows = await this.prisma.eventException.findMany({
			where: { eventId },
			orderBy: { occurrenceStart: 'asc' },
		});
		return rows.map((row) => toEventExceptionDomain(row));
	}

	async upsert(eventId: string, occurrenceStart: Date): Promise<void> {
		await this.prisma.eventException.upsert({
			where: {
				eventId_occurrenceStart: {
					eventId,
					occurrenceStart,
				},
			},
			create: {
				eventId,
				occurrenceStart,
			},
			update: {},
		});
	}

	async deleteByEventId(eventId: string): Promise<void> {
		await this.prisma.eventException.deleteMany({ where: { eventId } });
	}

	async deleteByEventIds(eventIds: string[]): Promise<void> {
		if (eventIds.length === 0) {
			return;
		}

		await this.prisma.eventException.deleteMany({ where: { eventId: { in: eventIds } } });
	}

	async moveFutureToEvent(params: {
		sourceEventId: string;
		targetEventId: string;
		fromOccurrenceStart: Date;
	}): Promise<void> {
		const { sourceEventId, targetEventId, fromOccurrenceStart } = params;

		await this.prisma.$transaction(async (tx) => {
			const rows = await tx.eventException.findMany({
				where: {
					eventId: sourceEventId,
					occurrenceStart: { gte: fromOccurrenceStart },
				},
				select: { occurrenceStart: true },
			});

			if (rows.length === 0) {
				return;
			}

			await tx.eventException.deleteMany({
				where: {
					eventId: sourceEventId,
					occurrenceStart: { gte: fromOccurrenceStart },
				},
			});

			await tx.eventException.createMany({
				data: rows.map((row) => ({
					eventId: targetEventId,
					occurrenceStart: row.occurrenceStart,
				})),
				skipDuplicates: true,
			});
		});
	}
}
