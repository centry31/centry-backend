import { EVENT_REPOSITORY, EventRepository } from 'calendar/application/ports/event.repository';

import { Inject, NotFoundException } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
	eventId: string;
};

export class DeleteEventUseCase {
	constructor(@Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepository) {}

	async execute(cmd: Cmd): Promise<void> {
		return runUseCase(async () => {
			const event = await this.eventRepository.findByIdWithSpaceId(cmd.eventId, cmd.spaceId);
			if (!event) {
				throw new NotFoundException('Событие не найдено');
			}

			await this.eventRepository.delete(cmd.eventId, cmd.spaceId);
		});
	}
}
