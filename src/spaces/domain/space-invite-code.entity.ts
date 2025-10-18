import type { ExpiresAt } from './value-objects/expires-at.vo';
import type { InviteCode } from './value-objects/invite-code.vo';

export class SpaceInviteCode {
	public readonly code: InviteCode;
	public createdByUserId: string;
	public maxUses: number;
	public usedCount: number;
	public readonly spaceId: string;
	public expiresAt: ExpiresAt;
	public readonly createdAt?: Date;
	public usedAt?: Date;

	constructor(props: {
		code: InviteCode;
		createdByUserId: string;
		maxUses: number;
		usedCount?: number;
		spaceId: string;
		expiresAt: ExpiresAt;
		createdAt?: Date;
		usedAt?: Date;
	}) {
		this.code = props.code;
		this.createdByUserId = props.createdByUserId;
		this.maxUses = props.maxUses;
		this.usedCount = props.usedCount ?? 0;
		this.spaceId = props.spaceId;
		this.expiresAt = props.expiresAt;
		this.createdAt = props.createdAt;
		this.usedAt = props.usedAt;
	}

	isExpired(): boolean {
		return this.expiresAt.isExpired();
	}

	canBeUsed(): boolean {
		return !this.usedAt && this.usedCount < this.maxUses;
	}

	markUsed(): void {
		if (!this.canBeUsed()) {
			throw new Error('Cannot mark used: already used or expired');
		}

		this.usedCount += 1;

		if (this.usedCount >= this.maxUses) {
			this.usedAt = new Date();
		}
	}
}
