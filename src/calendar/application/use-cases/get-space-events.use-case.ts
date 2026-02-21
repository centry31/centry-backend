import {
	EVENT_REPOSITORY,
	EventRepository,
} from 'calendar/application/ports/event/event.repository';
import {
	EVENT_OVERRIDE_REPOSITORY,
	EventOverrideRepository,
} from 'calendar/application/ports/event-override/event-override.repository';

import type { MaterializedEvent } from './helpers/event-series';
import { materializeEventsInRange } from './helpers/event-series';

import { Inject } from '@nestjs/common';
import { runUseCase } from 'common/application/errors/run-use-case';

type Cmd = {
	spaceId: string;
	from: Date;
	to: Date;
};

export class GetSpaceEventsUseCase {
	constructor(
		@Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepository,
		@Inject(EVENT_OVERRIDE_REPOSITORY)
		private readonly eventOverrideRepository: EventOverrideRepository,
	) {}

	async execute(cmd: Cmd): Promise<MaterializedEvent[]> {
		return runUseCase(async () => {
			const events = await this.eventRepository.findManyBySpaceId(cmd.spaceId);
			const overridesByEventId = await this.eventOverrideRepository.findByEventIds(
				events.map((event) => event.id),
			);

			return materializeEventsInRange({
				events,
				overridesByEventId,
				from: cmd.from,
				to: cmd.to,
			});
		});
	}
}
