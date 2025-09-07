import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { CreateEventDto } from './dto/create-event-dto';
import { UpdateEventDto } from 'events/dto/update-event.dto';

@Injectable()
export class EventsService {
	constructor(private readonly prismaService: PrismaService) {}

	/**
	 * Получает все события, которые привязаны к конкретному пространству
	 * */
	async getEvents(spaceId: string) {
		return this.prismaService.event.findMany({ where: { spaceId } });
	}

	/**
	 * Создает событие конкретному пространству
	 *
	 * @todo нужно добавить роли для создания, пока что создавать может только владалец пространства
	 * */
	async createEvents(createEventDto: CreateEventDto, userId: string, spaceId: string) {
		const { title, description, start, end, isAllDay } = createEventDto;

		const currentSpace = await this.prismaService.space.findFirst({
			where: { id: spaceId },
		});

		// TODO: temp! added user roles for spaces (editor)
		if (currentSpace.ownerID !== userId) {
			throw new HttpException(
				'У вас нет доступа для редактирования данного пространства',
				HttpStatus.FORBIDDEN,
			);
		}

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
		return createdEvent;
	}

	/**
	 * Обновляет событие у конкретного пространства
	 *
	 * @todo нужно добавить роли для изменения, пока что менять может только владелец пространства
	 * */
	async updateEvent(
		updateEventDto: UpdateEventDto,
		eventId: string,
		userId: string,
		spaceId: string,
	) {
		const { title, description, start, end, isAllDay } = updateEventDto;

		const currentSpace = await this.prismaService.space.findFirst({
			where: { id: spaceId },
		});

		// TODO: temp! added user roles for spaces (editor)
		if (currentSpace.ownerID !== userId) {
			throw new HttpException(
				'У вас нет доступа для редактирования данного пространства',
				HttpStatus.FORBIDDEN,
			);
		}

		const updatedEvent = await this.prismaService.event.update({
			where: { id: eventId },
			data: {
				title,
				description,
				start,
				end,
				isAllDay,
			},
		});
		return updatedEvent;
	}

	/**
	 * Удаляет событие у конкретного пространства
	 *
	 * @todo нужно добавить роли для удаления, пока что менять может только удаления пространства
	 * */
	async deleteEvent(eventId: string, userId: string, spaceId: string) {
		const currentSpace = await this.prismaService.space.findFirst({
			where: { id: spaceId },
		});

		// TODO: temp! added user roles for spaces (editor)
		if (currentSpace.ownerID !== userId) {
			throw new HttpException(
				'У вас нет доступа для редактирования данного пространства',
				HttpStatus.FORBIDDEN,
			);
		}

		const deletedEvent = await this.prismaService.event.delete({ where: { id: eventId } });
		return deletedEvent;
	}
}
