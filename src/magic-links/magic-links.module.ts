import { Module } from '@nestjs/common';
import { MagicLinksService } from './magic-links.service';
import { PrismaService } from 'prisma.service';
import { MagicLinksRepository } from './magic-links.repository';
import { UsersModule } from 'users/users.module';

@Module({
	controllers: [],
	providers: [MagicLinksService, PrismaService, MagicLinksRepository],
	exports: [MagicLinksService],
	imports: [UsersModule],
})
export class MagicLinksModule {}
