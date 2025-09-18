import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { PrismaService } from 'prisma.service';
import { BotModule } from 'bot/bot.module';
import { UsersModule } from 'users/users.module';
import { MagicLinksModule } from 'magic-links/magic-links.module';
import { AuthModule } from 'auth/auth.module';
import { EventsModule } from 'events/events.module';
import { SpacesModule } from 'spaces/spaces.module';
import { EventRemindersModule } from 'event-reminders/event-reminders.module';
import { TgLinkCodesModule } from 'tg-link-codes/tg-link-codes.module';
import { SpaceInvitesModule } from 'space-invites/space-invites.module';

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
		BotModule,
		UsersModule,
		MagicLinksModule,
		AuthModule,
		EventsModule,
		SpacesModule,
		EventRemindersModule,
		TgLinkCodesModule,
		SpaceInvitesModule,
	],
})
export class AppModule {}
