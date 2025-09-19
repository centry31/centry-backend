import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { CreateEventReminderDto } from 'event-reminders/dto/create-event-reminder.dto';
import { EventRemindersQueue } from './event-reminders.queue';
import { addMinutes } from 'date-fns';

/**
 * EventRemindersService
 * =====================
 * Доменный сервис для работы с напоминаниями о событиях.
 *
 * Основные обязанности:
 *  - Создание напоминаний для событий и постановка задач в очередь на отправку.
 *  - Массовая отмена напоминаний по ID события (удаление задач из очереди).
 *
 * Взаимодействия:
 *  - Использует PrismaService для доступа к БД.
 *  - Делегирует планирование/отмену задач в EventRemindersQueue.
 */
@Injectable()
export class EventRemindersService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly eventRemindersQueue: EventRemindersQueue,
	) {}

	/**
	 * Создаёт напоминание для события и планирует его отправку.
	 *
	 * @param dto DTO с данными о напоминании (offsetMinutes)
	 * @param eventId ID события в БД
	 *
	 * @throws HttpException 404, если событие не найдено
	 *
	 * @returns Созданное напоминание
	 */
	async createByEventId(dto: CreateEventReminderDto, eventId: string) {
		const event = await this.prismaService.event.findUnique({ where: { id: eventId } });
		if (!event) throw new HttpException('Такое событие не найдено', HttpStatus.NOT_FOUND);

		const scheduledAt = addMinutes(event.start, -dto.offsetMinutes);

		const reminder = await this.prismaService.eventReminder.create({
			data: { eventId, offsetMinutes: dto.offsetMinutes, scheduledAt },
		});
		await this.eventRemindersQueue.scheduleSend(reminder.id, scheduledAt);
		return reminder;
	}

	/**
	 * Отменяет все напоминания для указанного события.
	 *
	 * @param eventId ID события в БД
	 */
	async cancelAllByEventId(eventId: string) {
		const eventReminders = await this.prismaService.eventReminder.findMany({
			where: { eventId },
		});

		for (const eventReminder of eventReminders) {
			await this.eventRemindersQueue.cancel(eventReminder.id);
		}
	}
}
