import { Module } from '@nestjs/common';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { PrismaService } from 'prisma.service';
import { AuthModule } from 'auth/auth.module';

@Module({
	controllers: [SpacesController],
	providers: [SpacesService, PrismaService],
	imports: [AuthModule],
})
export class SpacesModule {}
