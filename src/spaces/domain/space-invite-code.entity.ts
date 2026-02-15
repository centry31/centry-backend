import { DateTime } from './value-objects/date-time.vo';
import type { ExpiresAt } from './value-objects/expires-at.vo';
import type { InviteCode } from './value-objects/invite-code.vo';

type Props = {
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
	public readonly createdAt?: DateTime;
	public readonly createdByUserId: string;
	public readonly maxUses: number;
	public readonly expiresAt: ExpiresAt;

	private _usedCount: number;
	private _usedAt?: DateTime;

	constructor(props: Props) {
		this.code = props.code;
		this.spaceId = props.spaceId;
		this.createdAt = props.createdAt;
		this.createdByUserId = props.createdByUserId;
		this.maxUses = props.maxUses;
		this.expiresAt = props.expiresAt;

		this._usedCount = props.usedCount ?? 0;
		this._usedAt = props.usedAt;
	}

	// getters
	get usedCount() {
		return this._usedCount;
	}
	get usedAt() {
		return this._usedAt;
	}

	canBeUsed(): boolean {
		return !this._usedAt && this._usedCount < this.maxUses;
	}

	use(): void {
		if (!this.canBeUsed()) {
			throw new Error('Cannot mark used: already used or expired');
		}

		this._usedCount += 1;

		if (this._usedCount >= this.maxUses) {
			this._usedAt = DateTime.now();
		}
	}
}
