import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaService } from 'prisma.service';
import { UsersModule } from 'users/users.module';
import { AuthModule } from 'auth/auth.module';
import { EventRemindersModule } from 'event-reminders/event-reminders.module';
import { SpacesModule } from 'spaces/spaces.module';
import { EventsRepository } from './events.repository';

@Module({
	controllers: [EventsController],
	providers: [EventsService, PrismaService, EventsRepository],
	imports: [AuthModule, UsersModule, EventRemindersModule, SpacesModule],
})
export class EventsModule {}
