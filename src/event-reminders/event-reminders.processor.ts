import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma.service';
import { BotAdapter } from 'bot/bot.adapter';

/**
 * RemindersProcessor
 * ==================
 * Обрабатывает задания очереди `eventReminders` (BullMQ) и отправляет уведомления
 * о событиях в связанные телеграм‑чаты пространства.
 *
 * Поток выполнения:
 *  1) Извлекаем `reminderId` из payload задачи.
 *  2) Загружаем напоминание с привязанным событием и автором.
 *  3) Пропускаем задачу, если напоминание не найдено или уже помечено как отправленное (`sentAt`).
 *  4) Находим все TG‑чаты, связанные со space события, формируем текст уведомления.
 *  5) Отправляем сообщение в каждый из чатов через `BotAdapter`.
 *  6) Помечаем напоминание как отправленное (`sentAt = now`).
 *
 * Идемпотентность:
 *  - Повторная обработка того же reminder безопасна благодаря проверке `sentAt`.
 *
 * Замечания по времени:
 *  - Используется `toLocaleString()` на сервере; это форматирует дату в таймзоне окружения процесса.
 *    Если требуется строгая TZ (например, Europe/Amsterdam) — передайте явную локаль/опции
 *    или формируйте строку на клиенте.
 *
 * Ошибки/ретраи:
 *  - BullMQ по умолчанию может ретраить джобы; исключения в методе `process` приведут к повторной попытке.
 *    При добавлении сетевых вызовов (TG API) учитывайте лимиты и добавляйте backoff на уровне конфигурации очереди.
 */
@Processor('eventReminders')
@Injectable()
export class RemindersProcessor extends WorkerHost {
	private readonly logger = new Logger(RemindersProcessor.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly tgBot: BotAdapter,
	) {
		super();
	}

	/**
	 * Обработка одной джобы напоминания.
	 *
	 * @param job.payload { reminderId: string } — идентификатор записи `eventReminder` в БД
	 * @effects Отправляет сообщение во все TG‑чаты, связанные со space события. Помечает напоминание как отправленное.
	 */
	async process(job: Job<{ reminderId: string }>) {
		const { reminderId } = job.data;
		// ID напоминания приходит из планировщика/создателя задач (см. место, где enqueue-ится job)

		// Берём напоминание вместе с событием и автором — автор может пригодиться для персональных уведомлений
		const reminder = await this.prisma.eventReminder.findUnique({
			where: { id: reminderId },
			include: { event: { include: { createdBy: true } } },
		});
		// Идемпотентность: если напоминания нет или оно уже отправлено — выходим без ошибок
		if (!reminder || reminder.sentAt) return;

		// Все TG‑чаты, привязанные к space события — туда и разошлём уведомление
		const spaceTgGroups = await this.prisma.spaceTgChat.findMany({
			where: { spaceId: reminder.event.spaceId },
		});

		const text = `Напоминание: ${
			reminder.event.title
		}\nНачало: ${reminder.event.start.toLocaleString()}`;

		// Отправляем во все доступные чаты; BotAdapter уже прокидывает Cookie с TG_API_TOKEN
		spaceTgGroups.forEach((group) => {
			if (group.chatTgId) {
				this.tgBot.sendMessage(
					group.chatTgId.toString(),
					group.messageThreadId.toString(),
					text,
				);
			}
		});

		// Помечаем как отправленное — защита от повторной доставки при ретраях
		await this.prisma.eventReminder.update({
			where: { id: reminder.id },
			data: { sentAt: new Date() },
		});

		this.logger.log(`Sent reminder ${reminder.id}`);
	}
}
