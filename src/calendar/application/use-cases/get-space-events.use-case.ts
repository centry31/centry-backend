import type { Event } from 'calendar/domain/event.entity';

import { EVENT_REPOSITORY, EventRepository } from 'calendar/application/ports/event.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	spaceId: string;
};

export class GetSpaceEventsUseCase {
	constructor(@Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepository) {}

	async execute(cmd: Cmd): Promise<Event[]> {
		return this.eventRepository.findManyBySpaceId(cmd.spaceId);
	}
}
