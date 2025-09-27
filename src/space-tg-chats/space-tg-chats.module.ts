import { forwardRef, Module } from '@nestjs/common';
import { SpaceTgChatsController } from './space-tg-chats.controller';
import { SpaceTgChatsService } from './space-tg-chats.service';
import { AuthModule } from 'auth/auth.module';
import { SpacesModule } from 'spaces/spaces.module';
import { TgLinkCodesModule } from 'tg-link-codes/tg-link-codes.module';
import { PrismaService } from 'prisma.service';
import { BotModule } from 'bot/bot.module';

@Module({
	controllers: [SpaceTgChatsController],
	providers: [SpaceTgChatsService, PrismaService],
	imports: [AuthModule, SpacesModule, TgLinkCodesModule, forwardRef(() => BotModule)],
	exports: [SpaceTgChatsService],
})
export class SpaceTgChatsModule {}
