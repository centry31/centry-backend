import { InitAuthUseCase } from './application/use-cases/auth/init-auth.use-case';
import { TelegramMiniAppAuthUseCase } from './application/use-cases/auth/telegram-mini-app-auth.use-case';
import { TelegramWidgetAuthUseCase } from './application/use-cases/auth/telegram-widget-auth-use.case';
import { RegisterUserUseCase } from './application/use-cases/user/register-user.use-case';

import { TOKEN_SERVICE } from './application/ports/jwt/token.service';
import { LOGIN_MAGIC_LINK_REPOSITORY } from './application/ports/login-magic-link/login-magic-link.repository';
import { USER_REPOSITORY } from './application/ports/user/user.repository';

import { JwtTokenService } from './infrastructure/jwt/jwt-token.service';
import { PrismaLoginMagicLinkRepository } from './infrastructure/prisma/login-magic-link/prisma-login-magic-link.repository';
import { PrismaUserRepository } from './infrastructure/prisma/user/prisma-user.repository';
import { ENV } from 'common/infrastructure/env';

import { AuthController } from './interface/auth.controller';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'prisma.module';

@Module({
	imports: [
		PrismaModule,
		JwtModule.register({
			secret: ENV.JWT_SECRET_KEY,
			signOptions: {
				expiresIn: '24h',
			},
		}),
	],
	controllers: [AuthController],
	providers: [
		RegisterUserUseCase,
		TelegramWidgetAuthUseCase,
		TelegramMiniAppAuthUseCase,
		InitAuthUseCase,

		{ provide: USER_REPOSITORY, useClass: PrismaUserRepository },
		{ provide: LOGIN_MAGIC_LINK_REPOSITORY, useClass: PrismaLoginMagicLinkRepository },
		{ provide: TOKEN_SERVICE, useClass: JwtTokenService },
	],
	exports: [JwtModule],
})
export class UsersModule {}
