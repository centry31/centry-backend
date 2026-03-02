import { DomainValidationError } from 'common/domain/errors/domain.error';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { ExpiresAt } from './value-objects/expires-at.vo';

type SpaceTgChatLinkCodeProps = {
	id: string;
	spaceId: string;
	hashCode: string;
	createdByUserId: string;
	expiresAt: ExpiresAt;
	createdAt: DateTime;

	usedAt?: DateTime;
	maxUses: number;
	usedCount?: number;
};

export class SpaceTgChatLinkCode {
	public readonly id: string;
	public readonly spaceId: string;
	public readonly hashCode: string;
	public readonly createdByUserId: string;
	public readonly expiresAt: ExpiresAt;
	public readonly createdAt: DateTime;

	private _usedAt?: DateTime;
	private _maxUses: number;
	private _usedCount: number;

	constructor(props: SpaceTgChatLinkCodeProps) {
		if (!props.hashCode.trim()) {
			throw new DomainValidationError('hashCode cannot be empty');
		}
		if (props.maxUses < 1) {
			throw new DomainValidationError('maxUses must be greater than 0');
		}

		const usedCount = props.usedCount ?? 0;
		if (usedCount < 0) {
			throw new DomainValidationError('usedCount cannot be negative');
		}
		if (usedCount > props.maxUses) {
			throw new DomainValidationError('usedCount cannot exceed maxUses');
		}

		this.id = props.id;
		this.spaceId = props.spaceId;
		this.hashCode = props.hashCode;
		this.createdByUserId = props.createdByUserId;
		this.expiresAt = props.expiresAt;
		this.createdAt = props.createdAt;

		this._usedAt = props.usedAt;
		this._maxUses = props.maxUses;
		this._usedCount = usedCount;
	}

	get usedAt(): DateTime | undefined {
		return this._usedAt;
	}
	get maxUses(): number {
		return this._maxUses;
	}
	get usedCount(): number {
		return this._usedCount;
	}

	canBeUsed(now: DateTime = DateTime.now()): boolean {
		if (this._usedCount >= this._maxUses) {
			return false;
		}
		if (this.expiresAt.isExpired(now)) {
			return false;
		}
		if (this._usedAt) {
			return false;
		}

		return true;
	}

	use(now: DateTime = DateTime.now()): void {
		if (!this.canBeUsed(now)) {
			throw new DomainValidationError('Cannot mark used: already used or expired');
		}

		this._usedCount += 1;

		if (this._usedCount >= this.maxUses) {
			this._usedAt = now;
		}
	}
}
