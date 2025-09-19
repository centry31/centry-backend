import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { CreateEventDto } from './dto/create-event-dto';
import { UpdateEventDto } from 'events/dto/update-event.dto';
import { EventRemindersService } from 'event-reminders/event-reminders.service';
import { SpacesService } from 'spaces/spaces.service';

@Injectable()
export class EventsService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly eventRemindersService: EventRemindersService,
		private readonly spacesService: SpacesService,
	) {}

	/**
	 * Получает все события, которые привязаны к конкретному пространству
	 * */
	async getEvents(spaceId: string) {
		return this.prismaService.event.findMany({
			where: { spaceId },
			include: { reminders: true },
		});
	}

	/**
	 * Создает событие конкретному пространству
	 *
	 * @todo нужно добавить роли для создания, пока что создавать может только владалец пространства
	 * */
	async createEvent(createEventDto: CreateEventDto, userId: string, spaceId: string) {
		const { title, description, start, end, isAllDay, reminders } = createEventDto;

		const createdEvent = await this.prismaService.event.create({
			data: {
				title,
				description,
				start,
				end,
				isAllDay,

				space: { connect: { id: spaceId } },
				createdBy: { connect: { id: userId } },
			},
		});

		const currentSpace = await this.spacesService.getSpace(spaceId);
		if (currentSpace.hasActiveTgChats) {
			/** Создаем все напоминания */
			for (const reminder of reminders) {
				await this.eventRemindersService.createByEventId(reminder, createdEvent.id);
			}
		}

		return createdEvent;
	}

	/**
	 * Обновляет событие у конкретного пространства
	 *
	 * @todo нужно добавить роли для изменения, пока что менять может только владелец пространства
	 * */
	async updateEvent(updateEventDto: UpdateEventDto, eventId: string, spaceId: string) {
		const { title, description, start, end, isAllDay, reminders } = updateEventDto;

		await this.prismaService.event.update({
			where: { id: eventId, spaceId },
			data: {
				title,
				description,
				start,
				end,
				isAllDay,
				reminders: { deleteMany: {} },
			},
		});

		const currentSpace = await this.spacesService.getSpace(spaceId);
		if (currentSpace.hasActiveTgChats) {
			/** Очищаем все существующие напоминания и планируем заново */
			await this.eventRemindersService.cancelAllByEventId(eventId);
			for (const reminder of reminders) {
				await this.eventRemindersService.createByEventId(reminder, eventId);
			}
		}

		return this.prismaService.event.findUnique({
			where: { id: eventId },
			include: { reminders: true },
		});
	}

	/**
	 * Удаляет событие у конкретного пространства
	 *
	 * @todo нужно добавить роли для удаления, пока что менять может только удаления пространства
	 * */
	async deleteEvent(eventId: string, spaceId: string) {
		const deletedEvent = await this.prismaService.event.delete({
			where: { id: eventId, spaceId },
		});
		return deletedEvent;
	}
}
