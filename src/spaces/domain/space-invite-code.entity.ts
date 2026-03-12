import { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { InviteCode } from './value-objects/invite-code.vo';

type SpaceInviteCodeProps = {
	code: InviteCode;
	createdByUserId: string;
	spaceId: string;
	createdAt?: DateTime;
};

export class SpaceInviteCode {
	public readonly code: InviteCode;
	public readonly spaceId: string;
	public readonly createdAt: DateTime;
	public readonly createdByUserId: string;

	constructor(props: SpaceInviteCodeProps) {
		this.code = props.code;
		this.spaceId = props.spaceId;
		this.createdAt = props.createdAt ?? DateTime.now();
		this.createdByUserId = props.createdByUserId;
	}
}
