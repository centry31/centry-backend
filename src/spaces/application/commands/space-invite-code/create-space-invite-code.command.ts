export type CreateSpaceInviteCodeCommand = {
	maxUses: number;
	expiresAt: Date;
	spaceId: string;
	createdByUserId: string;
};
