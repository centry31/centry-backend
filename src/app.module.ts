import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CalendarModule } from 'calendar/calendar.module';
import { SpacesModule } from 'spaces/spaces.module';
import { UsersModule } from 'users/users.module';

@Module({
	controllers: [],
	providers: [],
	imports: [
		ConfigModule.forRoot({
			envFilePath: '.env',
		}),
		BullModule.forRoot({
			connection: {
				host: process.env.REDIS_HOST || 'localhost',
				port: +process.env.REDIS_PORT || 6379,
			},
		}),
		UsersModule,
		SpacesModule,
		CalendarModule,
	],
})
export class AppModule {}
