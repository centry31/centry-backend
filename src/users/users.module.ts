import { InitAuthUseCase } from './application/use-cases/auth/init-auth.use-case';
import { TelegramAuthUseCase } from './application/use-cases/auth/telegram-auth.use-case';
import { RegisterUserUseCase } from './application/use-cases/user/register-user.use-case';

import { TOKEN_SERVICE } from './application/ports/jwt/token.service';
import { LOGIN_MAGIC_LINK_REPOSITORY } from './application/ports/login-magic-link/login-magic-link.repository';
import { USER_REPOSITORY } from './application/ports/user/user.repository';

import { JwtTokenService } from './infrastructure/jwt/jwt-token.service';
import { PrismaLoginMagicLinkRepository } from './infrastructure/prisma/login-magic-link/prisma-login-magic-link.repository';
import { PrismaUserRepository } from './infrastructure/prisma/user/prisma-user.repository';

import { AuthController } from './interface/auth.controller';
import { JwtAuthGuard } from './interface/guard/auth/jwt-auth.guard';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'prisma.service';

@Module({
	imports: [
		JwtModule.register({
			// TODO: выставить через env
			secret: process.env.SECRET_KEY || 'SECRET',
			signOptions: {
				expiresIn: '24h',
			},
		}),
	],
	controllers: [AuthController],
	providers: [
		PrismaService,

		RegisterUserUseCase,
		TelegramAuthUseCase,
		InitAuthUseCase,

		{ provide: USER_REPOSITORY, useClass: PrismaUserRepository },
		{ provide: LOGIN_MAGIC_LINK_REPOSITORY, useClass: PrismaLoginMagicLinkRepository },
		{ provide: TOKEN_SERVICE, useClass: JwtTokenService },
	],
	exports: [JwtModule],
})
export class UsersModule {}
