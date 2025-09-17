import { Module } from '@nestjs/common';
import { TgLinkCodesService } from './tg-link-codes.service';
import { PrismaService } from 'prisma.service';
import { TgLinkCodesController } from './tg-link-codes.controller';
import { AuthModule } from 'auth/auth.module';
import { UsersModule } from 'users/users.module';
import { SpacesModule } from 'spaces/spaces.module';

@Module({
	providers: [TgLinkCodesService, PrismaService],
	exports: [TgLinkCodesService],
	controllers: [TgLinkCodesController],
	imports: [AuthModule, UsersModule, SpacesModule],
})
export class TgLinkCodesModule {}
