import type { Event } from 'calendar/domain/event.entity';

import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';

import { Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
};

export class GetSpaceEventsUseCase {
	constructor(@Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepository) {}

	async execute(cmd: Cmd): Promise<Event[]> {
		return runUseCase(async () => {
			return this.eventRepository.findManyBySpaceId(cmd.spaceId);
		});
	}
}
