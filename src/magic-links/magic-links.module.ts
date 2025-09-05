import { Module } from '@nestjs/common';
import { MagicLinksService } from './magic-links.service';
import { PrismaService } from 'prisma.service';

@Module({
	controllers: [],
	providers: [MagicLinksService, PrismaService],
	exports: [MagicLinksService],
})
export class MagicLinksModule {}
