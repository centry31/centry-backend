import { forwardRef, Module } from '@nestjs/common';
import { SpaceTgChatsController } from './space-tg-chats.controller';
import { SpaceTgChatsService } from './space-tg-chats.service';
import { AuthModule } from 'auth/auth.module';
import { SpacesModule } from 'spaces/spaces.module';
import { SpaceLinkCodesModule } from 'space-link-codes/space-link-codes.module';
import { PrismaService } from 'prisma.service';
import { BotModule } from 'bot/bot.module';
import { SpaceTgChatsRepository } from './space-tg-chats.repository';

@Module({
	controllers: [SpaceTgChatsController],
	providers: [SpaceTgChatsService, PrismaService, SpaceTgChatsRepository],
	imports: [AuthModule, SpacesModule, SpaceLinkCodesModule, forwardRef(() => BotModule)],
	exports: [SpaceTgChatsService],
})
export class SpaceTgChatsModule {}
