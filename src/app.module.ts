import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { PrismaService } from 'prisma.service';
import { UsersModule } from 'users/users.module';
import { SpacesModule } from 'spaces/spaces.module';
import { AuthModule } from './auth/auth.module';

@Module({
	controllers: [],
	providers: [PrismaService],
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
		AuthModule,
	],
})
export class AppModule {}
