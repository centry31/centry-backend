import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { CreateEventDto } from './dto/create-event-dto';

@Injectable()
export class EventsService {
	constructor(private readonly prismaService: PrismaService) {}

	/**
	 * Получает все события, которые привязаны к конкретному пространству
	 * */
	async getEvents(spaceId: string) {
		const events = await this.prismaService.event.findMany({ where: { id: spaceId } });
		return events;
	}

	/**
	 * Создает событие конкретному пространству
	 *
	 * @todo нужно добавить роли для создания, пока что создавать может только владалец пространства
	 * */
	async createEvents(createEventDto: CreateEventDto, userId: string, spaceId: string) {
		const { title, description, start, end, isAllDay, type } = createEventDto;

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
				type,

				space: { connect: { id: spaceId } },
				createdBy: { connect: { id: userId } },
			},
		});

		return createdEvent;
	}
}
