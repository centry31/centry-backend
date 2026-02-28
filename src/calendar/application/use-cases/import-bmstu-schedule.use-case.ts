import { CreateEventUseCase } from './create-event.use-case';

import { Injectable } from '@nestjs/common';
import { ImportBmstuScheduleService } from 'bmstu';
import { runUseCase } from 'common/application/errors/run-use-case';

/**
 * Команда импорта расписания МГТУ в пространство.
 */
type Cmd = {
	groupId: string;
	spaceId: string;
	createdById: string;
	timeZone: string;
};

type Result = {
	importedCount: number;
};

// TODO: в идеале нельзя кейс использовать в кейсе, но тут уж логика бы не изменилась.
// TODO: если что-то в дальнейшем поменяется, то вынести создание сюда напрямую и убрать импорт

/**
 * Импортирует расписание группы МГТУ и создает события календаря в указанном space.
 */
@Injectable()
export class ImportBmstuScheduleUseCase {
	constructor(
		private readonly importBmstuScheduleService: ImportBmstuScheduleService,
		private readonly createEventUseCase: CreateEventUseCase,
	) {}

	async execute(cmd: Cmd): Promise<Result> {
		return runUseCase(async () => {
			const importedEvents = await this.importBmstuScheduleService.importGroupSchedule({
				groupId: cmd.groupId,
				timeZone: cmd.timeZone,
			});

			// await Promise.all(
			// 	importedEvents.map((event) =>
			// 		this.createEventUseCase.execute({
			// 			title: event.title,
			// 			description: event.description,
			// 			start: event.start,
			// 			duration: event.duration,
			// 			timeZone: event.timeZone,
			// 			recurrence: event.recurrence,
			// 			createdById: cmd.createdById,
			// 			spaceId: cmd.spaceId,
			// 			reminders: [],
			// 			isNotifyMessage: false,
			// 			notifyMessage: '',
			// 		}),
			// 	),
			// );

			return { importedCount: importedEvents.length };
		});
	}
}
