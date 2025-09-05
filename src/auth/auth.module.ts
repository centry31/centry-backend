import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from 'prisma.service';
import { MagicLinksModule } from 'magic-links/magic-links.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
	controllers: [AuthController],
	providers: [AuthService, PrismaService],
	imports: [
		MagicLinksModule,
		JwtModule.register({
			// TODO: выставить через env
			secret: process.env.SECRET_KEY || 'SECRET',
			signOptions: {
				expiresIn: '24h',
			},
		}),
	],
})
export class AuthModule {}
