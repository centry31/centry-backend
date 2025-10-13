import { Module } from '@nestjs/common';

import { PrismaService } from 'prisma.service';

import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';

import { USER_REPOSITORY } from './application/ports/user.repository';

import { PrismaUserRepository } from './infrastructure/prisma/prisma-user.repository';

@Module({
	imports: [],
	controllers: [],
	providers: [
		PrismaService,

		RegisterUserUseCase,

		{ provide: USER_REPOSITORY, useClass: PrismaUserRepository },
	],
	exports: [],
})
export class UsersModule {}
