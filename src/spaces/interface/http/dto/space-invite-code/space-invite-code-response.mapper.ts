import type { SpaceInviteCode } from '@spaces/domain/space-invite-code.entity';

type SpaceInviteCodeResponse = {
	code: string;
	maxUses: number;
	usedCount?: number;
	expiresAt: Date;
};

export const toSpaceInviteCodeResponse = (
	spaceInviteCode: SpaceInviteCode,
): SpaceInviteCodeResponse => ({
	code: spaceInviteCode.code.value,
	maxUses: spaceInviteCode.maxUses,
	usedCount: spaceInviteCode.usedCount,
	expiresAt: spaceInviteCode.expiresAt.value,
});
