import { Module } from '@nestjs/common';
import { EventRemindersService } from './event-reminders.service';
import { PrismaService } from 'prisma.service';
import { BullModule } from '@nestjs/bullmq';
import { EventRemindersQueue } from './event-reminders.queue';
import { RemindersProcessor } from './event-reminders.processor';
import { BotModule } from 'bot/bot.module';
import { EventRemindersRepository } from './event-reminders.repository';

@Module({
	providers: [
		EventRemindersService,
		PrismaService,
		EventRemindersQueue,
		RemindersProcessor,
		EventRemindersRepository,
	],
	imports: [
		BullModule.registerQueue({
			name: 'eventReminders',
		}),
		BotModule,
	],
	exports: [EventRemindersService],
})
export class EventRemindersModule {}
