import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * EventRemindersQueue
 * ===================
 * Сервис-обёртка над BullMQ-очередью `eventReminders`.
 * Отвечает за постановку задач на отправку напоминаний и их отмену.
 *
 * Методы:
 *  - scheduleSend(reminderId, scheduledAt) — планирует задачу на указанное время с задержкой.
 *    * delay вычисляется как разница между scheduledAt и текущим временем.
 *    * jobId = reminderId, что позволяет однозначно идентифицировать и отменять задачу.
 *    * removeOnComplete: true — удаляем задачу после успешного выполнения.
 *    * attempts: 5 + экспоненциальный backoff (30s, 60s, 120s, …).
 *    * Если delay <= 0 → задача не создаётся.
 *
 *  - cancel(reminderId) — отменяет задачу по её ID, если она существует в очереди.
 *
 * Использование:
 *  - Сервис внедряется в EventRemindersService/EventService и вызывается при создании/обновлении напоминаний.
 *  - Обеспечивает идемпотентность (jobId совпадает с reminderId).
 */
@Injectable()
export class EventRemindersQueue {
	constructor(@InjectQueue('eventReminders') private readonly queue: Queue) {}

	/**
	 * Планирует отправку напоминания.
	 *
	 * @param reminderId ID напоминания в БД
	 * @param scheduledAt Время, когда нужно отправить уведомление
	 */
	async scheduleSend(reminderId: string, scheduledAt: Date) {
		const delay = Math.max(0, scheduledAt.getTime() - Date.now());
		if (delay === 0) return;

		await this.queue.add(
			'send',
			{ reminderId },
			{
				jobId: reminderId,
				delay,
				removeOnComplete: true,
				attempts: 5,
				backoff: { type: 'exponential', delay: 30000 }, // 30s, 60s, ...
			},
		);
	}

	/**
	 * Отменяет задачу по ID напоминания (если она ещё в очереди).
	 *
	 * @param reminderId ID напоминания в БД
	 */
	async cancel(reminderId: string) {
		const job = await this.queue.getJob(reminderId);
		if (job) await job.remove();
	}
}
