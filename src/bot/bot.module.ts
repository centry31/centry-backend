import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { PrismaService } from 'prisma.service';
import { UsersModule } from 'users/users.module';
import { MagicLinksModule } from 'magic-links/magic-links.module';

@Module({
	providers: [BotService, PrismaService],
	controllers: [BotController],
	imports: [UsersModule, MagicLinksModule],
})
export class BotModule {}
