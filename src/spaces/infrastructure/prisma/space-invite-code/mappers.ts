import { SpaceInviteCode } from '@spaces/domain/space-invite-code.entity';
import { InviteCode } from '@spaces/domain/value-objects/invite-code.vo';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

type Row = {
	code: string;
	createdByUserId: string;
	spaceId: string;
	createdAt: Date;
};

export function toDomain(row: Row): SpaceInviteCode {
	return new SpaceInviteCode({
		code: new InviteCode(row.code),
		createdByUserId: row.createdByUserId,
		spaceId: row.spaceId,
		createdAt: DateTime.fromDate(row.createdAt),
	});
}

export function toPersistence(spaceInviteCode: SpaceInviteCode): Row {
	return {
		code: spaceInviteCode.code.value,
		createdByUserId: spaceInviteCode.createdByUserId,
		spaceId: spaceInviteCode.spaceId,
		createdAt: spaceInviteCode.createdAt.value,
	};
}
