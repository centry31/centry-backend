import { CreateEventUseCase } from './application/use-cases/create-event.use-case';
import { DeleteEventUseCase } from './application/use-cases/delete-event.use-case';
import { GetSpaceEventsUseCase } from './application/use-cases/get-space-events.use-case';
import { UpdateEventUseCase } from './application/use-cases/update-event.use-case';

import { EVENT_REPOSITORY } from './application/ports/event.repository';

import { PrismaEventRepository } from './infrastructure/prisma/prisma-event.repository';
import { PrismaSpaceTgChatQuery } from './infrastructure/prisma/prisma-space-tg-chat.query';

import { EventsController } from './interface/http/events.controller';

import { Module } from '@nestjs/common';
import { SPACE_TG_CHAT_QUERY } from 'spaces';
import { UsersModule } from 'users';

@Module({
	controllers: [EventsController],
	providers: [
		GetSpaceEventsUseCase,
		CreateEventUseCase,
		DeleteEventUseCase,
		UpdateEventUseCase,

		{ provide: EVENT_REPOSITORY, useClass: PrismaEventRepository },
		{ provide: SPACE_TG_CHAT_QUERY, useClass: PrismaSpaceTgChatQuery },
	],
	imports: [UsersModule],
	exports: [],
})
export class CalendarModule {}
