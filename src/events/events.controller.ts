import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { SpaceMemberAccessGuard } from 'spaces/guards/space-member-access.guard';
import { CreateEventDto } from './dto/create-event-dto';
import { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { EventsService } from './events.service';
import { formatResponse } from 'common/utils/response.util';
import { EventDto } from './dto/event.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateEventDto } from './dto/update-event.dto';
import { SpaceOwnerAccessGuard } from 'spaces/guards/space-owner-access.guard';

@Controller('events')
@UseGuards(JwtAuthGuard, SpaceMemberAccessGuard)
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
	@UseGuards(SpaceOwnerAccessGuard)
	async createEvent(
		@Body() createEventDto: CreateEventDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { user, currentSpaceId } = req;

		const createdEvent = await this.eventsService.createEvent(
			createEventDto,
			user.id,
			currentSpaceId,
		);
		const validatedEvent = plainToInstance(EventDto, createdEvent, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedEvent, 'Событие успешно создано');
	}

	@Patch(':id')
	@UseGuards(SpaceOwnerAccessGuard)
	async updateEvent(
		@Body() updateEventDto: UpdateEventDto,
		@Request() req: AuthenticatedRequest,
		@Param('id') id: string,
	) {
		const { currentSpaceId } = req;

		const updatedEvent = await this.eventsService.updateEvent(
			updateEventDto,
			id,
			currentSpaceId,
		);
		const validatedEvent = plainToInstance(EventDto, updatedEvent, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedEvent, 'Событие успешно обновлено');
	}

	@Delete(':id')
	@UseGuards(SpaceOwnerAccessGuard)
	async deleteEvent(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
		const { currentSpaceId } = req;

		const deletedEvent = await this.eventsService.deleteEvent(id, currentSpaceId);
		const validatedEvent = plainToInstance(EventDto, deletedEvent, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedEvent, 'Событие успешно обновлено');
	}
}
