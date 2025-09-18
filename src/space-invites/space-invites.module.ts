import { Module } from '@nestjs/common';
import { SpaceInvitesController } from './space-invites.controller';
import { SpaceInvitesService } from './space-invites.service';
import { SpacesModule } from 'spaces/spaces.module';
import { PrismaService } from 'prisma.service';
import { AuthModule } from 'auth/auth.module';

@Module({
	controllers: [SpaceInvitesController],
	providers: [SpaceInvitesService, PrismaService],
	imports: [SpacesModule, AuthModule],
})
export class SpaceInvitesModule {}
