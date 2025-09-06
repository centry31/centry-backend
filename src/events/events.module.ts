import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaService } from 'prisma.service';
import { UsersModule } from 'users/users.module';
import { AuthModule } from 'auth/auth.module';

@Module({
	controllers: [EventsController],
	providers: [EventsService, PrismaService],
	imports: [AuthModule, UsersModule],
})
export class EventsModule {}
