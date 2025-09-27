import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { PrismaService } from 'prisma.service';
import { UsersModule } from 'users/users.module';
import { MagicLinksModule } from 'magic-links/magic-links.module';
import { BotAdapter } from './bot.adapter';
import { SpaceTgChatsModule } from 'space-tg-chats/space-tg-chats.module';

@Module({
	providers: [BotService, PrismaService, BotAdapter],
	controllers: [BotController],
	imports: [UsersModule, MagicLinksModule, SpaceTgChatsModule],
	exports: [BotAdapter],
})
export class BotModule {}
