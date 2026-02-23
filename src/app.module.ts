import { ENV } from 'common/infrastructure/env';

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BmstuModule } from 'bmstu/bmstu.module';
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
				host: ENV.REDIS_HOST,
				port: ENV.REDIS_PORT,
			},
		}),
		UsersModule,
		SpacesModule,
		CalendarModule,
		BmstuModule,
	],
})
export class AppModule {}
