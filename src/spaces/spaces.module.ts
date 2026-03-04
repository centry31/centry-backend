import { CreateSpaceUseCase } from './application/use-cases/space/create-space.use-case';
import { DeleteSpaceUseCase } from './application/use-cases/space/delete-space.use-case';
import { GetSpaceUseCase } from './application/use-cases/space/get-space.use-case';
import { GetUserSpacesUseCase } from './application/use-cases/space/get-user-spaces.use-case';
import { UpdateSpaceUseCase } from './application/use-cases/space/update-space.use-case';
import { AcceptSpaceInviteCodeUseCase } from './application/use-cases/space-invite-code/accept-space-invite-code.use-case';
import { CreateSpaceInviteCodeUseCase } from './application/use-cases/space-invite-code/create-space-invite-code.use-case';
import { DeleteSpaceInviteCodeUseCase } from './application/use-cases/space-invite-code/delete-space-invite-code.use-case';
import { GetInfoSpaceInviteCodeUseCase } from './application/use-cases/space-invite-code/get-info-space-invite-code.use-case';
import { GetSpaceInviteCodesUseCase } from './application/use-cases/space-invite-code/get-space-invite-codes.use-case';
import { DeleteSpaceMemberUseCase } from './application/use-cases/space-member/delete-space-member.use-case';
import { GetSpaceMembersUseCase } from './application/use-cases/space-member/get-space-members.use-case';
import { LeaveSpaceUseCase } from './application/use-cases/space-member/leave-space.use-case';
import { DeleteSpaceTgChatUseCase } from './application/use-cases/space-tg-chat/delete-space-tg-chat.use-case';
import { GetSpaceTgChatsUseCase } from './application/use-cases/space-tg-chat/get-space-tg-chats.use-case';
import { CreateSpaceTgChatLinkCodeUseCase } from './application/use-cases/space-tg-chat-link-code/create-space-tg-chat-link-code.use-case';
import { UseSpaceTgChatLinkCodeUseCase } from './application/use-cases/space-tg-chat-link-code/use-space-tg-chat-link-code.use-case';

import { SPACE_REPOSITORY } from './application/ports/space/space.repository';
import { SPACE_INVITE_CODE_REPOSITORY } from './application/ports/space-invite-code/space-invite-code.repository';
import { SPACE_MEMBER_REPOSITORY } from './application/ports/space-member/space-member.repository';
import { SPACE_TG_CHAT_REPOSITORY } from './application/ports/space-tg-chat/space-tg-chat.repository';
import { SPACE_TG_CHAT_LINK_CODE_REPOSITORY } from './application/ports/space-tg-chat-link-code/space-tg-chat-link-code.repository';

import { PrismaSpaceRepository } from './infrastructure/prisma/space/prisma-space.repository';
import { PrismaSpaceInviteCodesRepository } from './infrastructure/prisma/space-invite-code/prisma-space-invite-codes.repository';
import { PrismaSpaceMemberRepository } from './infrastructure/prisma/space-member/prisma-space-member.repository';
import { PrismaSpaceTgChatRepository } from './infrastructure/prisma/space-tg-chat/prisma-space-tg-chat.repository';
import { PrismaSpaceTgChatLinkCodeRepository } from './infrastructure/prisma/space-tg-chat-link-code/prisma-space-tg-chat-link-code.repository';
import { PrismaUserQuery } from './infrastructure/prisma/user-query/prisma-user.query';

import { SpaceMemberAccessGuard } from './interface/guard/space-member-access.guard';
import { SpaceOwnerAccessGuard } from './interface/guard/space-owner-access.guard';
import { SpaceInviteCodesController } from './interface/http/space-invite-codes.controller';
import { SpaceMembersController } from './interface/http/space-members.controller';
import { SpaceTgChatController } from './interface/http/space-tg-chat.controller';
import { SpaceTgChatLinksController } from './interface/http/space-tg-chat-links.controller';
import { SpacesController } from './interface/http/spaces.controller';

import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma.module';
import { USER_QUERY, UsersModule } from 'users';

@Module({
	imports: [PrismaModule, UsersModule],
	controllers: [
		SpacesController,
		SpaceMembersController,
		SpaceInviteCodesController,
		SpaceTgChatLinksController,
		SpaceTgChatController,
	],
	providers: [
		CreateSpaceUseCase,
		GetUserSpacesUseCase,
		GetSpaceUseCase,
		UpdateSpaceUseCase,
		DeleteSpaceUseCase,

		CreateSpaceTgChatLinkCodeUseCase,
		UseSpaceTgChatLinkCodeUseCase,

		DeleteSpaceMemberUseCase,
		LeaveSpaceUseCase,
		GetSpaceMembersUseCase,

		AcceptSpaceInviteCodeUseCase,
		CreateSpaceInviteCodeUseCase,
		GetInfoSpaceInviteCodeUseCase,
		GetSpaceInviteCodesUseCase,
		DeleteSpaceInviteCodeUseCase,

		GetSpaceTgChatsUseCase,
		DeleteSpaceTgChatUseCase,

		SpaceOwnerAccessGuard,
		SpaceMemberAccessGuard,

		{ provide: SPACE_REPOSITORY, useClass: PrismaSpaceRepository },
		{ provide: SPACE_MEMBER_REPOSITORY, useClass: PrismaSpaceMemberRepository },
		{ provide: SPACE_INVITE_CODE_REPOSITORY, useClass: PrismaSpaceInviteCodesRepository },
		{
			provide: SPACE_TG_CHAT_LINK_CODE_REPOSITORY,
			useClass: PrismaSpaceTgChatLinkCodeRepository,
		},
		{ provide: SPACE_TG_CHAT_REPOSITORY, useClass: PrismaSpaceTgChatRepository },
		{ provide: USER_QUERY, useClass: PrismaUserQuery },
	],
	exports: [
		SpaceOwnerAccessGuard,
		SpaceMemberAccessGuard,
		SPACE_REPOSITORY,
		SPACE_MEMBER_REPOSITORY,
	],
})
export class SpacesModule {}
