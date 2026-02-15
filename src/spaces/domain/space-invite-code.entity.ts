import { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { ExpiresAt } from './value-objects/expires-at.vo';
import type { InviteCode } from './value-objects/invite-code.vo';

type SpaceInviteCodeProps = {
	code: InviteCode;
	createdByUserId: string;
	maxUses: number;
	usedCount?: number;
	spaceId: string;
	expiresAt: ExpiresAt;
	createdAt?: DateTime;
	usedAt?: DateTime;
};

export class SpaceInviteCode {
	public readonly code: InviteCode;
	public readonly spaceId: string;
	public readonly createdAt: DateTime;
	public readonly createdByUserId: string;
	public readonly maxUses: number;
	public readonly expiresAt: ExpiresAt;

	private _usedCount: number;
	private _usedAt?: DateTime;

	constructor(props: SpaceInviteCodeProps) {
		if (props.maxUses < 1) {
			throw new Error('maxUses must be greater than 0');
		}

		const usedCount = props.usedCount ?? 0;
		if (usedCount < 0) {
			throw new Error('usedCount cannot be negative');
		}
		if (usedCount > props.maxUses) {
			throw new Error('usedCount cannot exceed maxUses');
		}

		this.code = props.code;
		this.spaceId = props.spaceId;
		this.createdAt = props.createdAt ?? DateTime.now();
		this.createdByUserId = props.createdByUserId;
		this.maxUses = props.maxUses;
		this.expiresAt = props.expiresAt;

		this._usedCount = usedCount;
		this._usedAt = props.usedAt;
	}

	get usedCount(): number {
		return this._usedCount;
	}

	get usedAt(): DateTime | undefined {
		return this._usedAt;
	}

	canBeUsed(now: DateTime = DateTime.now()): boolean {
		if (this.expiresAt.isExpired(now)) {
			return false;
		}
		if (this._usedAt) {
			return false;
		}
		return this._usedCount < this.maxUses;
	}

	use(now: DateTime = DateTime.now()): void {
		if (!this.canBeUsed(now)) {
			throw new Error('Cannot mark used: already used or expired');
		}

		this._usedCount += 1;

		if (this._usedCount >= this.maxUses) {
			this._usedAt = now;
		}
	}
}
