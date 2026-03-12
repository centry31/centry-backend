import type { SpaceInviteCode } from '@spaces/domain/space-invite-code.entity';

type SpaceInviteCodeResponse = {
	code: string;
};

export const toSpaceInviteCodeResponse = (
	spaceInviteCode: SpaceInviteCode,
): SpaceInviteCodeResponse => ({
	code: spaceInviteCode.code.value,
});
