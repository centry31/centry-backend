import { Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event-dto';
import { UpdateEventDto } from 'events/dto/update-event.dto';
import { EventRemindersService } from 'event-reminders/event-reminders.service';
import { SpacesService } from 'spaces/spaces.service';
import { EventsRepository } from './events.repository';

@Injectable()
export class EventsService {
	constructor(
		private readonly eventsRepository: EventsRepository,
		private readonly eventRemindersService: EventRemindersService,
		private readonly spacesService: SpacesService,
	) {}

	/**
	 * Получает все события, которые привязаны к конкретному пространству
	 */
	async getEvents(spaceId: string) {
		return this.eventsRepository.findManyBySpaceId(spaceId);
	}

	/**
	 * Создает событие конкретному пространству
	 * @todo роли: пока только владелец
	 */
	async createEvent(createEventDto: CreateEventDto, userId: string, spaceId: string) {
		const { title, description, start, end, isAllDay, reminders } = createEventDto;

		const createdEvent = await this.eventsRepository.createEvent({
			title,
			description,
			start,
			end,
			isAllDay,
			space: { connect: { id: spaceId } },
			createdBy: { connect: { id: userId } },
		});

		const currentSpace = await this.spacesService.getOne(spaceId);
		const hasActiveTgChats = await this.spacesService.getHasActiveTgChatsFlag(currentSpace.id);

		if (hasActiveTgChats) {
			for (const reminder of reminders) {
				await this.eventRemindersService.createByEventId(reminder, createdEvent.id);
			}
		}

		return createdEvent;
	}

	/**
	 * Обновляет событие у конкретного пространства
	 * @todo роли: пока только владелец
	 */
	async updateEvent(updateEventDto: UpdateEventDto, eventId: string, spaceId: string) {
		const { title, description, start, end, isAllDay, reminders } = updateEventDto;

		await this.eventsRepository.updateEventClearingReminders(
			{ id: eventId, spaceId },
			{
				title,
				description,
				start,
				end,
				isAllDay,
			},
		);

		const currentSpace = await this.spacesService.getOne(spaceId);
		const hasActiveTgChats = await this.spacesService.getHasActiveTgChatsFlag(currentSpace.id);

		if (hasActiveTgChats) {
			// Очищаем все существующие напоминания и планируем заново
			await this.eventRemindersService.cancelAllByEventId(eventId);
			for (const reminder of reminders) {
				await this.eventRemindersService.createByEventId(reminder, eventId);
			}
		}

		return this.eventsRepository.findByIdWithReminders(eventId);
	}

	/**
	 * Удаляет событие у конкретного пространства
	 * @todo роли: пока только владелец пространства
	 */
	async deleteEvent(eventId: string, spaceId: string) {
		const deletedEvent = await this.eventsRepository.deleteByIdWithSpaceCheck({
			id: eventId,
			spaceId,
		});
		return deletedEvent;
	}
}
