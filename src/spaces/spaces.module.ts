import { Module } from '@nestjs/common';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { PrismaService } from 'prisma.service';
import { AuthModule } from 'auth/auth.module';
import { UsersModule } from 'users/users.module';
import { SpacesRepository } from './spaces.repository';

@Module({
	controllers: [SpacesController],
	providers: [SpacesService, PrismaService, SpacesRepository],
	imports: [AuthModule, UsersModule],
	exports: [SpacesService, SpacesRepository],
})
export class SpacesModule {}
