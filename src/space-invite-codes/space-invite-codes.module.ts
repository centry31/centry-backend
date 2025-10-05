import { Module } from '@nestjs/common';
import { SpaceInviteCodesController } from './space-invite-codes.controller';
import { SpaceInviteCodesService } from './space-invite-codes.service';
import { SpacesModule } from 'spaces/spaces.module';
import { PrismaService } from 'prisma.service';
import { AuthModule } from 'auth/auth.module';
import { SpaceInviteCodesRepository } from './space-invite-codes.repository';

@Module({
	controllers: [SpaceInviteCodesController],
	providers: [SpaceInviteCodesService, PrismaService, SpaceInviteCodesRepository],
	imports: [SpacesModule, AuthModule],
})
export class SpaceInviteCodesModule {}
