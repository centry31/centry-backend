import { CreateEventUseCase } from './application/use-cases/create-event.use-case';
import { DeleteEventUseCase } from './application/use-cases/delete-event.use-case';
import { GetSpaceEventsUseCase } from './application/use-cases/get-space-events.use-case';
import { UpdateEventUseCase } from './application/use-cases/update-event.use-case';

import { EVENT_REPOSITORY } from './application/ports/event/event.repository';
import { REMINDER_SCHEDULER } from './application/ports/reminder-scheduler/reminder-scheduler.port';
import { REMINDER_TG_NOTIFIER } from './application/ports/reminder-tg-notifier/reminder-tg-notifier.port';

import { PrismaEventRepository } from './infrastructure/prisma/prisma-event.repository';
import { PrismaSpaceTgChatQuery } from './infrastructure/prisma/prisma-space-tg-chat.query';
import { BullReminderScheduler } from './infrastructure/queue/bull-reminder.scheduler';
import { ReminderProcessor } from './infrastructure/queue/reminder.processor';
import { REMINDER_QUEUE_NAME } from './infrastructure/queue/reminder-queue.constants';
import { HttpReminderNotifier } from './infrastructure/telegram/http-reminder-notifier';

import { EventsController } from './interface/http/events.controller';

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SPACE_TG_CHAT_QUERY } from 'spaces';
import { UsersModule } from 'users';

@Module({
	controllers: [EventsController],
	providers: [
		GetSpaceEventsUseCase,
		CreateEventUseCase,
		DeleteEventUseCase,
		UpdateEventUseCase,

		ReminderProcessor,

		{ provide: EVENT_REPOSITORY, useClass: PrismaEventRepository },
		{ provide: SPACE_TG_CHAT_QUERY, useClass: PrismaSpaceTgChatQuery },
		{ provide: REMINDER_SCHEDULER, useClass: BullReminderScheduler },
		{ provide: REMINDER_TG_NOTIFIER, useClass: HttpReminderNotifier },
	],
	imports: [UsersModule, ConfigModule, BullModule.registerQueue({ name: REMINDER_QUEUE_NAME })],
	exports: [],
})
export class CalendarModule {}
