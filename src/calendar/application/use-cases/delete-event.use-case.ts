import { EVENT_REPOSITORY, EventRepository } from 'calendar/application/ports/event.repository';

import { Inject } from '@nestjs/common';

type Cmd = {
	spaceId: string;
	eventId: string;
};

export class DeleteEventUseCase {
	constructor(@Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepository) {}

	async execute(cmd: Cmd): Promise<void> {
		await this.eventRepository.delete(cmd.eventId, cmd.spaceId);
	}
}
