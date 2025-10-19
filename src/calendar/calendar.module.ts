import { CreateEventUseCase } from './application/use-cases/create-event.use-case';
import { DeleteEventUseCase } from './application/use-cases/delete-event.use-case';
import { GetSpaceEventsUseCase } from './application/use-cases/get-space-events.use-case';
import { UpdateEventUseCase } from './application/use-cases/update-event.use-case';

import { EVENT_REPOSITORY } from './application/ports/event.repository';

import { PrismaEventRepository } from './infrastructure/prisma/prisma-event.repository';

import { EventsController } from './interface/http/events.controller';

import { Module } from '@nestjs/common';
import { UsersModule } from 'users';

@Module({
	controllers: [EventsController],
	providers: [
		GetSpaceEventsUseCase,
		CreateEventUseCase,
		DeleteEventUseCase,
		UpdateEventUseCase,

		{ provide: EVENT_REPOSITORY, useClass: PrismaEventRepository },
	],
	imports: [UsersModule],
	exports: [],
})
export class CalendarModule {}
