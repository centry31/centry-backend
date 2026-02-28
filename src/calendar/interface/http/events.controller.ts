import { CreateEventUseCase } from 'calendar/application/use-cases/create-event.use-case';
import { DeleteEventUseCase } from 'calendar/application/use-cases/delete-event.use-case';
import { GetSpaceEventsUseCase } from 'calendar/application/use-cases/get-space-events.use-case';
import { ImportBmstuScheduleUseCase } from 'calendar/application/use-cases/import-bmstu-schedule.use-case';
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
import { SpaceMemberAccessGuard, SpaceOwnerAccessGuard } from 'spaces';
import { JwtAuthGuard } from 'users';

@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
	constructor(
		private readonly createEventUseCase: CreateEventUseCase,
		private readonly getSpaceEventsUseCase: GetSpaceEventsUseCase,
		private readonly deleteEventUseCase: DeleteEventUseCase,
		private readonly updateEventUseCase: UpdateEventUseCase,
		private readonly importBmstuScheduleUseCase: ImportBmstuScheduleUseCase,
	) {}

	@UseGuards(SpaceOwnerAccessGuard)
	@Post(':spaceId/bmstu-import/:groupId')
	async importBmstuByGroup(
		@Param('spaceId') spaceId: string,
		@Param('groupId') groupId: string,
		@Query('timeZone') timeZone: string | undefined,
		@Request() req: AuthenticatedRequest,
	) {
		const { user } = req;
		const normalizedTimeZone = (timeZone ?? 'Europe/Moscow').trim() || 'Europe/Moscow';
		const result = await this.importBmstuScheduleUseCase.execute({
			spaceId,
			groupId,
			createdById: user.id,
			timeZone: normalizedTimeZone,
		});

		return formatResponse(result, `Импортировано событий: ${result.importedCount}`);
	}

	@UseGuards(SpaceMemberAccessGuard)
	@Get(':spaceId')
	async get(@Query() query: GetEventsQueryDto, @Param('spaceId') spaceId: string) {
		const events = await this.getSpaceEventsUseCase.execute({
			spaceId,
			from: query.from,
			to: query.to,
		});
		const response = events.map((event) => toEventResponse(event));
		return formatResponse(response, 'События получены');
	}

	@UseGuards(SpaceOwnerAccessGuard)
	@Post(':spaceId')
	async create(
		@Body() createEventDto: CreateEventDto,
		@Request() req: AuthenticatedRequest,
		@Param('spaceId') spaceId: string,
	) {
		const { user } = req;
		const event = await this.createEventUseCase.execute({
			title: createEventDto.title,
			description: createEventDto.description ?? null,
			start: createEventDto.start,
			duration: createEventDto.duration,
			timeZone: createEventDto.timeZone,
			createdById: user.id,
			frequency: createEventDto.frequency,
			until: createEventDto.until,
			spaceId,
			reminders: createEventDto.reminders ?? [],
			isNotifyMessage: createEventDto.isNotifyMessage,
			notifyMessage: createEventDto.notifyMessage,
		});
		const response = toEventResponse(event);
		return formatResponse(response, 'Событие создано');
	}

	@UseGuards(SpaceOwnerAccessGuard)
	@Patch(':spaceId/:eventId')
	async update(
		@Param('spaceId') spaceId: string,
		@Param('eventId') eventId: string,
		@Body() updateEventDto: UpdateEventDto,
	) {
		await this.updateEventUseCase.execute({
			id: eventId,
			spaceId,
			title: updateEventDto.title,
			description: updateEventDto.description,
			newStart: updateEventDto.newStart,
			oldStart: updateEventDto.oldStart,
			duration: updateEventDto.duration,
			timeZone: updateEventDto.timeZone,
			frequency: updateEventDto.frequency,
			until: updateEventDto.until,
			reminders: updateEventDto.reminders ?? [],
			scope: updateEventDto.scope,
		});
		return formatResponse(null, 'Событие обновлено');
	}

	@UseGuards(SpaceOwnerAccessGuard)
	@Delete(':spaceId/:eventId')
	async delete(
		@Param('spaceId') spaceId: string,
		@Param('eventId') eventId: string,
		@Query() query: DeleteEventQueryDto,
	) {
		await this.deleteEventUseCase.execute({
			eventId,
			spaceId,
			scope: query.scope,
			start: query.start,
		});
		return formatResponse(null, 'Событие удалено');
	}
}
