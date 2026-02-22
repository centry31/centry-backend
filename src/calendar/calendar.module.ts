import { CreateEventUseCase } from './application/use-cases/create-event.use-case';
import { DeleteEventUseCase } from './application/use-cases/delete-event.use-case';
import { GetSpaceEventsUseCase } from './application/use-cases/get-space-events.use-case';
import { UpdateEventUseCase } from './application/use-cases/update-event.use-case';

import { EVENT_REPOSITORY } from './application/ports/event/event.repository';
import { EVENT_EXCEPTION_REPOSITORY } from './application/ports/event-exception/event-exception.repository';
import { REMINDER_PLANNING } from './application/ports/reminder-planning/reminder-planning.port';
import { REMINDER_SCHEDULER } from './application/ports/reminder-scheduler/reminder-scheduler.port';
import { TG_NOTIFIER } from './application/ports/tg-notifier/tg-notifier.port';

import { PrismaEventRepository } from './infrastructure/prisma/prisma-event.repository';
import { PrismaEventExceptionRepository } from './infrastructure/prisma/prisma-event-exception.repository';
import { PrismaSpaceTgChatQuery } from './infrastructure/prisma/prisma-space-tg-chat.query';
import { BullReminderScheduler } from './infrastructure/queue/bull-reminder.scheduler';
import { ReminderProcessor } from './infrastructure/queue/reminder.processor';
import { REMINDER_QUEUE_NAME } from './infrastructure/queue/reminder-queue.constants';
import { HttpTgNotifier } from './infrastructure/telegram/http-tg-notifier';

import { EventsController } from './interface/http/events.controller';

import { RecurrenceService } from './application/services/recurrence/recurrence.service';
import { ReminderPlanningService } from './application/services/reminder-planning/reminder-planning.service';

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
		RecurrenceService,
		ReminderPlanningService,
		ReminderProcessor,

		{ provide: EVENT_REPOSITORY, useClass: PrismaEventRepository },
		{ provide: EVENT_EXCEPTION_REPOSITORY, useClass: PrismaEventExceptionRepository },
		{ provide: SPACE_TG_CHAT_QUERY, useClass: PrismaSpaceTgChatQuery },
		{ provide: REMINDER_PLANNING, useClass: ReminderPlanningService },
		{ provide: REMINDER_SCHEDULER, useClass: BullReminderScheduler },
		{ provide: TG_NOTIFIER, useClass: HttpTgNotifier },
	],
	imports: [UsersModule, ConfigModule, BullModule.registerQueue({ name: REMINDER_QUEUE_NAME })],
	exports: [],
})
export class CalendarModule {}
