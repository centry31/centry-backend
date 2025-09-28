import { Module } from '@nestjs/common';
import { SpaceInviteCodesController } from './space-invite-codes.controller';
import { SpaceInviteCodesService } from './space-invite-codes.service';
import { SpacesModule } from 'spaces/spaces.module';
import { PrismaService } from 'prisma.service';
import { AuthModule } from 'auth/auth.module';

@Module({
	controllers: [SpaceInviteCodesController],
	providers: [SpaceInviteCodesService, PrismaService],
	imports: [SpacesModule, AuthModule],
})
export class SpaceInviteCodesModule {}
