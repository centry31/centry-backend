import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateEventReminderDto } from './dto/create-event-reminder.dto';
import { EventRemindersQueue } from './event-reminders.queue';
import { addMinutes } from 'date-fns';
import { EventRemindersRepository } from './event-reminders.repository';

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
		private readonly eventRemindersRepository: EventRemindersRepository,
		private readonly eventRemindersQueue: EventRemindersQueue,
	) {}

	/**
	 * Создаёт напоминание для события и планирует его отправку.
	 *
	 * @param reminderDto DTO с данными о напоминании (offsetMinutes)
	 * @param eventId ID события в БД
	 *
	 * @throws HttpException 404, если событие не найдено
	 *
	 * @returns Созданное напоминание
	 */
	async createByEventId(reminderDto: CreateEventReminderDto, eventId: string) {
		const event = await this.eventRemindersRepository.findEventById(eventId);
		if (!event) throw new HttpException('Такое событие не найдено', HttpStatus.NOT_FOUND);

		const scheduledAt = addMinutes(event.start, -reminderDto.offsetMinutes);

		const reminder = await this.eventRemindersRepository.createReminder({
			event: { connect: { id: eventId } },
			offsetMinutes: reminderDto.offsetMinutes,
			scheduledAt,
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
		const eventReminders = await this.eventRemindersRepository.findManyByEventId(eventId);

		for (const eventReminder of eventReminders) {
			await this.eventRemindersQueue.cancel(eventReminder.id);
		}
	}
}
