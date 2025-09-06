import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from 'prisma.service';
import { BotModule } from 'bot/bot.module';
import { UsersModule } from 'users/users.module';
import { MagicLinksModule } from 'magic-links/magic-links.module';
import { AuthModule } from 'auth/auth.module';
import { EventsModule } from 'events/events.module';
import { SpacesModule } from 'spaces/spaces.module';

@Module({
	controllers: [],
	providers: [PrismaService],
	imports: [
		ConfigModule.forRoot({
			envFilePath: '.env',
		}),
		BotModule,
		UsersModule,
		MagicLinksModule,
		AuthModule,
		EventsModule,
		SpacesModule,
	],
})
export class AppModule {}
