import { Inject } from '@nestjs/common';

import { USER_QUERY, UserQuery } from 'users';

import {
	SPACE_MEMBER_REPOSITORY,
	SpaceMemberRepository,
} from '@spaces/application/ports/space-member/space-member.repository';
import { GetSpaceMembersCommand } from '@spaces/application/commands/space-member/get-space-members.command';

export class GetSpaceMembersUseCase {
	constructor(
		@Inject(SPACE_MEMBER_REPOSITORY)
		private readonly spaceMemberRepository: SpaceMemberRepository,
		@Inject(USER_QUERY)
		private readonly userQuery: UserQuery,
	) {}

	// TODO: подумать над тем, чтобы в дальнейшем ограничить эту ручку
	async execute(cmd: GetSpaceMembersCommand) {
		const members = await this.spaceMemberRepository.findManyBySpaceId(cmd.spaceId);
		const userIds = members.map((member) => member.userId);

		return this.userQuery.findByIds(userIds);
	}
}
