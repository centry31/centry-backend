import { CreateEventUseCase } from 'calendar/application/use-cases/create-event.use-case';
import { DeleteEventUseCase } from 'calendar/application/use-cases/delete-event.use-case';
import { GetSpaceEventsUseCase } from 'calendar/application/use-cases/get-space-events.use-case';
import { UpdateEventUseCase } from 'calendar/application/use-cases/update-event.use-case';

import { CreateEventDto } from './dto/create-event.dto';
import { toEventResponse } from './dto/event-response.mapper';
import { UpdateEventDto } from './dto/update-event.dto';

import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Request,
	UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';
import { JwtAuthGuard } from 'users';

// TODO: накинуть гварды
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
	async get(@Request() req: AuthenticatedRequest) {
		const { currentSpaceId } = req;
		const events = await this.getSpaceEventsUseCase.execute({ spaceId: currentSpaceId });
		const response = events.map((reminder) => toEventResponse(reminder));
		return formatResponse(response, 'Напоминания получены');
	}

	@Post()
	async create(@Body() createEventDto: CreateEventDto, @Request() req: AuthenticatedRequest) {
		const { user, currentSpaceId } = req;
		const event = await this.createEventUseCase.execute({
			title: createEventDto.title,
			description: createEventDto.description,
			start: createEventDto.start,
			end: createEventDto.end,

			createdById: user.id,
			spaceId: currentSpaceId,
			reminders: createEventDto.reminders ?? [],

			isNotifyMessage: createEventDto.isNotifyMessage,
			notifyMessage: createEventDto.notifyMessage,
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
			end: updateEventDto.end,
			reminders: updateEventDto.reminders ?? [],
		});
		return formatResponse(null, 'Событие обновлено');
	}

	@Delete(':eventId')
	async delete(@Param('eventId') eventId: string, @Request() req: AuthenticatedRequest) {
		const { currentSpaceId } = req;
		await this.deleteEventUseCase.execute({ eventId, spaceId: currentSpaceId });
		return formatResponse(null, 'Уведомление удалено');
	}
}
