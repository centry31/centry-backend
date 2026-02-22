import { CreateEventUseCase } from 'calendar/application/use-cases/create-event.use-case';
import { DeleteEventUseCase } from 'calendar/application/use-cases/delete-event.use-case';
import { GetSpaceEventsUseCase } from 'calendar/application/use-cases/get-space-events.use-case';
import { UpdateEventUseCase } from 'calendar/application/use-cases/update-event.use-case';

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

/**
 * HTTP-контроллер событий календаря.
 *
 * Все операции выполняются в контексте текущего авторизованного space.
 */
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
	constructor(
		private readonly createEventUseCase: CreateEventUseCase,
		private readonly getSpaceEventsUseCase: GetSpaceEventsUseCase,
		private readonly deleteEventUseCase: DeleteEventUseCase,
		private readonly updateEventUseCase: UpdateEventUseCase,
	) {}

	/**
	 * Возвращает материализованные инстансы событий в заданном диапазоне дат.
	 */
	@Get()
	async get(@Query() query: GetEventsQueryDto, @Request() req: AuthenticatedRequest) {
		const { currentSpaceId } = req;
		const events = await this.getSpaceEventsUseCase.execute({
			spaceId: currentSpaceId,
			from: query.from,
			to: query.to,
		});
		const response = events.map((event) => toEventResponse(event));
		return formatResponse(response, 'События получены');
	}

	/**
	 * Создает одноразовое событие или повторяющуюся серию.
	 */
	@Post()
	async create(@Body() createEventDto: CreateEventDto, @Request() req: AuthenticatedRequest) {
		const { user, currentSpaceId } = req;
		const event = await this.createEventUseCase.execute({
			title: createEventDto.title,
			description: createEventDto.description ?? null,
			start: createEventDto.start,
			duration: createEventDto.duration,
			timeZone: createEventDto.timeZone,
			recurrence: createEventDto.recurrence,
			createdById: user.id,
			spaceId: currentSpaceId,
			reminders: createEventDto.reminders ?? [],
			isNotifyMessage: createEventDto.isNotifyMessage,
			notifyMessage: createEventDto.notifyMessage,
		});
		const response = toEventResponse(event);
		return formatResponse(response, 'Событие создано');
	}

	/**
	 * Обновляет событие согласно запрошенному scope.
	 */
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
			duration: updateEventDto.duration,
			timeZone: updateEventDto.timeZone,
			recurrence: updateEventDto.recurrence,
			reminders: updateEventDto.reminders ?? [],
			scope: updateEventDto.scope,
			occurrenceStart: updateEventDto.occurrenceStart,
		});
		return formatResponse(null, 'Событие обновлено');
	}

	/**
	 * Удаляет либо всю серию/событие, либо один инстанс в зависимости от scope.
	 */
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
			scope: query.scope,
			occurrenceStart: query.occurrenceStart,
		});
		return formatResponse(null, 'Событие удалено');
	}
}
