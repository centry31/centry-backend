import { Module } from '@nestjs/common';
import { SpaceLinkCodesService } from './space-link-codes.service';
import { PrismaService } from 'prisma.service';
import { SpaceLinkCodesController } from './space-link-codes.controller';
import { AuthModule } from 'auth/auth.module';
import { UsersModule } from 'users/users.module';
import { SpacesModule } from 'spaces/spaces.module';
import { SpaceLinkCodesRepository } from './space-link-codes.repository';

@Module({
	providers: [SpaceLinkCodesService, PrismaService, SpaceLinkCodesRepository],
	exports: [SpaceLinkCodesService],
	controllers: [SpaceLinkCodesController],
	imports: [AuthModule, UsersModule, SpacesModule],
})
export class SpaceLinkCodesModule {}
