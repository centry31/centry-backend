import { SpaceInviteCode } from '@spaces/domain/space-invite-code.entity';
import { ExpiresAt } from '@spaces/domain/value-objects/expires-at.vo';
import { InviteCode } from '@spaces/domain/value-objects/invite-code.vo';

type Row = {
	code: string;
	createdByUserId: string;
	maxUses: number;
	usedCount?: number;
	spaceId: string;
	expiresAt: Date;
	createdAt?: Date;
	usedAt?: Date;
};

export function toDomain(row: Row): SpaceInviteCode {
	return new SpaceInviteCode({
		code: new InviteCode(row.code),
		createdByUserId: row.createdByUserId,
		maxUses: row.maxUses,
		usedCount: row.usedCount,
		spaceId: row.spaceId,
		expiresAt: new ExpiresAt(row.expiresAt),
		createdAt: row.createdAt,
		usedAt: row.usedAt,
	});
}

export function toPersistence(spaceInviteCode: SpaceInviteCode): Row {
	return {
		code: spaceInviteCode.code.value,
		createdByUserId: spaceInviteCode.createdByUserId,
		maxUses: spaceInviteCode.maxUses,
		usedCount: spaceInviteCode.usedCount,
		spaceId: spaceInviteCode.spaceId,
		expiresAt: spaceInviteCode.expiresAt.value,
		createdAt: spaceInviteCode.createdAt,
		usedAt: spaceInviteCode.usedAt,
	};
}
