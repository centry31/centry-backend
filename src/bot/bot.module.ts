import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { PrismaService } from 'prisma.service';
import { UsersModule } from 'users/users.module';
import { MagicLinksModule } from 'magic-links/magic-links.module';
import { TgLinkCodesModule } from 'tg-link-codes/tg-link-codes.module';
import { BotAdapter } from './bot.adapter';

@Module({
	providers: [BotService, PrismaService, BotAdapter],
	controllers: [BotController],
	imports: [UsersModule, MagicLinksModule, TgLinkCodesModule],
	exports: [BotAdapter],
})
export class BotModule {}
