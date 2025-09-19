import { Expose } from 'class-transformer';

export class EventReminderDto {
	@Expose() eventId: number;
	@Expose() offsetMinutes: number;
}
