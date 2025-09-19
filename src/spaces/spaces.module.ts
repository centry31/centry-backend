import { Module } from '@nestjs/common';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { PrismaService } from 'prisma.service';
import { AuthModule } from 'auth/auth.module';
import { UsersModule } from 'users/users.module';

@Module({
	controllers: [SpacesController],
	providers: [SpacesService, PrismaService],
	imports: [AuthModule, UsersModule],
	exports: [SpacesService],
})
export class SpacesModule {}
