import { Body, Controller, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { SpaceAccessGuard } from 'spaces/space-access.guard';
import { CreateEventDto } from './dto/create-event-dto';
import { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { EventsService } from './events.service';
import { formatResponse } from 'common/utils/response.util';
import { EventDto } from './dto/event.dto';
import { plainToInstance } from 'class-transformer';

@Controller('events')
@UseGuards(JwtAuthGuard, SpaceAccessGuard)
export class EventsController {
	constructor(private readonly eventsService: EventsService) {}

	@Get()
	async getEvents(@Request() req: AuthenticatedRequest) {
		const { currentSpaceId } = req;

		const events = await this.eventsService.getEvents(currentSpaceId);
		const validatedEvents = events.map((event) =>
			plainToInstance(EventDto, event, { excludeExtraneousValues: true }),
		);
		return formatResponse(validatedEvents, 'События успешно получены');
	}

	@Post()
	async createEvent(
		@Body() createEventDto: CreateEventDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { user, currentSpaceId } = req;

		const createdEvent = await this.eventsService.createEvents(
			createEventDto,
			user.id,
			currentSpaceId,
		);
		const validatedEvent = plainToInstance(EventDto, createdEvent, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedEvent, 'Событие успешно создано');
	}

	@Put(':id')
	async updateEvent(
		@Body() createEventDto: CreateEventDto,
		@Request() req: AuthenticatedRequest,
		@Param('id') id: string,
	) {}
}
