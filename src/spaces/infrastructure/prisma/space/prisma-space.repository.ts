import type { Space } from '@spaces/domain/space.entity';

import type { SpaceRepository } from '@spaces/application/ports/space/space.repository';

import { toSpaceDomain, toSpacePersistence } from './mappers';

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';

@Injectable()
export class PrismaSpaceRepository implements SpaceRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string): Promise<Space | null> {
		const row = await this.prisma.space.findUnique({
			where: { id },
		});
		return row ? toSpaceDomain(row) : null;
	}

	async findManyByOwnerId(ownerId: string): Promise<Space[]> {
		const rows = await this.prisma.space.findMany({
			where: { ownerId },
		});
		return rows.map((row) => toSpaceDomain(row));
	}

	async findManyByMembershipUserId(userId: string): Promise<Space[]> {
		const rows = await this.prisma.space.findMany({
			where: { spaceMembers: { some: { userId } } },
		});
		return rows.map((row) => toSpaceDomain(row));
	}

	async create(space: Space): Promise<Space> {
		const data = toSpacePersistence(space);
		const row = await this.prisma.space.create({ data });
		return toSpaceDomain(row);
	}

	async updateInfo(space: Space): Promise<void> {
		const data = toSpacePersistence(space);
		await this.prisma.space.update({
			where: { id: space.id },
			data,
		});
	}

	// /**
	//  * Cинхронизирует SpaceTgChat по диффу:
	//  * - удаляет строки, которых нет в домене;
	//  * - создаёт новые;
	//  * - обновляет изменённые.
	//  */
	// async updateTgChats(space: Space): Promise<void> {
	// 	const desiredChats = space.tgChats; // ReadonlyArray<SpaceTgChat>
	//
	// 	await this.prisma.$transaction(async (tx) => {
	// 		// грузим текущее состояние чатов из БД
	// 		const existing: SpaceTgChatRow[] = await tx.spaceTgChat.findMany({
	// 			where: { spaceId: space.id },
	// 		});
	//
	// 		// строим индексы по id
	// 		const dbById = new Map(existing.map((r) => [r.id, r]));
	// 		const desiredById = new Map(desiredChats.map((c) => [c.id, c]));
	//
	// 		// к добавлению / удалению / обновлению
	// 		const toCreate = desiredChats.filter((c) => !dbById.has(c.id));
	// 		const toDeleteIds = existing.filter((r) => !desiredById.has(r.id)).map((r) => r.id);
	//
	// 		const toUpdate = desiredChats.filter((c) => {
	// 			const db = dbById.get(c.id);
	// 			if (!db) return false;
	// 			// сравниваем значимые поля (без дат)
	// 			const changed =
	// 				db.chatType !== c.type ||
	// 				(db.chatTitle ?? null) !== (c.title ?? null) ||
	// 				db.messageThreadId !== c.messageThreadId.value ||
	// 				db.isActive !== c.isActive ||
	// 				db.chatTgId !== c.chatId.value ||
	// 				db.initiatedByTgId !== c.initiatedByTgId.value;
	// 			return changed;
	// 		});
	//
	// 		// apply diff
	// 		if (toDeleteIds.length) {
	// 			await tx.spaceTgChat.deleteMany({ where: { id: { in: toDeleteIds } } });
	// 		}
	//
	// 		if (toCreate.length) {
	// 			await tx.spaceTgChat.createMany({
	// 				data: toCreate.map((c) => toSpaceTgChatPersistence(c)),
	// 				skipDuplicates: true, // на случай гонки по уникальному (spaceId, chatTgId, messageThreadId)
	// 			});
	// 		}
	//
	// 		for (const chat of toUpdate) {
	// 			await tx.spaceTgChat.update({
	// 				where: { id: chat.id },
	// 				data: toSpaceTgChatPersistence(chat),
	// 			});
	// 		}
	// 	});
	// }

	async delete(spaceId: string): Promise<void> {
		await this.prisma.space.delete({ where: { id: spaceId } });
	}
}
