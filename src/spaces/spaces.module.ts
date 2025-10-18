import { CreateSpaceUseCase } from './application/use-cases/space/create-space.use-case';
import { DeleteSpaceUseCase } from './application/use-cases/space/delete-space.use-case';
import { GetSpaceUseCase } from './application/use-cases/space/get-space.use-case';
import { GetUserSpacesUseCase } from './application/use-cases/space/get-user-spaces.use-case';
import { UpdateSpaceUseCase } from './application/use-cases/space/update-space.use-case';
import { AcceptSpaceInviteCodeUseCase } from './application/use-cases/space-invite-code/accept-space-invite-code.use-case';
import { CreateSpaceInviteCodeUseCase } from './application/use-cases/space-invite-code/create-space-invite-code.use-case';
import { DeleteSpaceInviteCodeUseCase } from './application/use-cases/space-invite-code/delete-space-invite-code.use-case';
import { GetActiveSpaceInviteCodesUseCase } from './application/use-cases/space-invite-code/get-active-space-invite-codes.use-case';
import { GetInfoSpaceInviteCodeUseCase } from './application/use-cases/space-invite-code/get-info-space-invite-code.use-case';
import { GetSpaceMembersUseCase } from './application/use-cases/space-member/get-space-members.use-case';
import { LeaveSpaceUseCase } from './application/use-cases/space-member/leave-space.use-case';
import { RemoveSpaceMemberUseCase } from './application/use-cases/space-member/remove-space-member.use-case';

import { SPACE_REPOSITORY } from './application/ports/space/space.repository';
import { SPACE_INVITE_CODE_REPOSITORY } from './application/ports/space-invite-code/space-invite-code.repository';
import { SPACE_MEMBER_REPOSITORY } from './application/ports/space-member/space-member.repository';

import { PrismaSpaceRepository } from './infrastructure/prisma/space/prisma-space.repository';
import { PrismaSpaceInviteCodesRepository } from './infrastructure/prisma/space-invite-code/prisma-space-invite-codes.repository';
import { PrismaSpaceMemberRepository } from './infrastructure/prisma/space-member/prisma-space-member.repository';
import { PrismaUserQuery } from './infrastructure/prisma/user-query/prisma-user.query';

import { SpaceInviteCodesController } from './interface/http/space-invite-codes.controller';
import { SpaceMembersController } from './interface/http/space-members.controller';
import { SpacesController } from './interface/http/spaces.controller';

import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma.module';
import { USER_QUERY, UsersModule } from 'users';

@Module({
	imports: [PrismaModule, UsersModule],
	controllers: [SpacesController, SpaceMembersController, SpaceInviteCodesController],
	providers: [
		CreateSpaceUseCase,
		GetUserSpacesUseCase,
		GetSpaceUseCase,
		UpdateSpaceUseCase,
		DeleteSpaceUseCase,

		RemoveSpaceMemberUseCase,
		LeaveSpaceUseCase,
		GetSpaceMembersUseCase,

		AcceptSpaceInviteCodeUseCase,
		CreateSpaceInviteCodeUseCase,
		GetInfoSpaceInviteCodeUseCase,
		GetActiveSpaceInviteCodesUseCase,
		DeleteSpaceInviteCodeUseCase,

		{ provide: SPACE_REPOSITORY, useClass: PrismaSpaceRepository },
		{ provide: SPACE_MEMBER_REPOSITORY, useClass: PrismaSpaceMemberRepository },
		{ provide: SPACE_INVITE_CODE_REPOSITORY, useClass: PrismaSpaceInviteCodesRepository },
		{ provide: USER_QUERY, useClass: PrismaUserQuery },
	],
	exports: [],
})
export class SpacesModule {}
