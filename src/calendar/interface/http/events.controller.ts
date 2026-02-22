import { CreateEventUseCase } from 'calendar/application/use-cases/create-event.use-case';
import { DeleteEventUseCase } from 'calendar/application/use-cases/delete-event.use-case';
import { GetSpaceEventsUseCase } from 'calendar/application/use-cases/get-space-events.use-case';
import { UpdateEventUseCase } from 'calendar/application/use-cases/update-event/update-event.use-case';

import { CreateEventDto } from './dto/create-event.dto';
import { DeleteEventQueryDto } from './dto/delete-event-query.dto';
import { toEventResponse } from './dto/event-response.mapper';
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { UpdateEventDto } from './dto/update-event.dto';

import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Request,
	UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';
import { JwtAuthGuard } from 'users';

// НУЖНО: подключить все необходимые guard-ы для календаря
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
	constructor(
		private readonly createEventUseCase: CreateEventUseCase,
		private readonly getSpaceEventsUseCase: GetSpaceEventsUseCase,
		private readonly deleteEventUseCase: DeleteEventUseCase,
		private readonly updateEventUseCase: UpdateEventUseCase,
	) {}

	@Get()
	async get(@Query() query: GetEventsQueryDto, @Request() req: AuthenticatedRequest) {
		const { currentSpaceId } = req;
		const events = await this.getSpaceEventsUseCase.execute({
			spaceId: currentSpaceId,
			from: query.from,
			to: query.to,
		});
		const response = events.map((event) => toEventResponse(event));
		return formatResponse(response, 'Напоминания получены');
	}

	@Post()
	async create(@Body() createEventDto: CreateEventDto, @Request() req: AuthenticatedRequest) {
		const { user, currentSpaceId } = req;
		const event = await this.createEventUseCase.execute({
			title: createEventDto.title,
			description: createEventDto.description,
			start: createEventDto.start,
			repeatUntil: createEventDto.repeatUntil,
			duration: createEventDto.duration,

			createdById: user.id,
			spaceId: currentSpaceId,

			reminders: createEventDto.reminders ?? [],

			isNotifyMessage: createEventDto.isNotifyMessage,
			notifyMessage: createEventDto.notifyMessage,

			frequency: createEventDto.frequency,
		});
		const response = toEventResponse(event);
		return formatResponse(response, 'Напоминание создано');
	}

	@Patch(':eventId')
	async update(
		@Param('eventId') eventId: string,
		@Body() updateEventDto: UpdateEventDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { currentSpaceId } = req;
		await this.updateEventUseCase.execute({
			eventId,
			spaceId: currentSpaceId,

			title: updateEventDto.title,
			description: updateEventDto.description,

			start: updateEventDto.start,
			repeatUntil: updateEventDto.repeatUntil,
			duration: updateEventDto.duration,

			reminders: updateEventDto.reminders,
			frequency: updateEventDto.frequency,

			updateType: updateEventDto.updateType,
			orderIndex: updateEventDto.orderIndex,
		});
		return formatResponse(null, 'Событие обновлено');
	}

	@Delete(':eventId')
	async delete(
		@Param('eventId') eventId: string,
		@Query() query: DeleteEventQueryDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { currentSpaceId } = req;
		await this.deleteEventUseCase.execute({
			eventId,
			spaceId: currentSpaceId,
			orderIndex: query.orderIndex,
		});
		return formatResponse(null, 'Уведомление удалено');
	}
}
