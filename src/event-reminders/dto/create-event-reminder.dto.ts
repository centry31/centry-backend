import { IsInt, Max, Min } from 'class-validator';

export class CreateEventReminderDto {
	@IsInt()
	@Min(0)
	@Max(60 * 24 * 14) // до 14 дней
	offsetMinutes: number;
}
