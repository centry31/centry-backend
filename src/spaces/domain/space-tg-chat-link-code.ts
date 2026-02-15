import { DateTime } from './value-objects/date-time.vo';
import type { ExpiresAt } from './value-objects/expires-at.vo';

type Props = {
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
	private _usedCount?: number;

	constructor(props: Props) {
		this.id = props.id;
		this.spaceId = props.spaceId;
		this.hashCode = props.hashCode;
		this.createdByUserId = props.createdByUserId;
		this.expiresAt = props.expiresAt;
		this.createdAt = props.createdAt;

		this._usedAt = props.usedAt;
		this._maxUses = props.maxUses;
		this._usedCount = props.usedCount ?? 0;
	}

	get usedAt() {
		return this._usedAt;
	}
	get maxUses() {
		return this._maxUses;
	}
	get usedCount() {
		return this._usedCount;
	}

	canBeUsed(): boolean {
		if (this._usedCount >= this._maxUses) {
			return false;
		}
		if (this.expiresAt.isExpired()) {
			return false;
		}
		return true;
	}

	use(): void {
		if (!this.canBeUsed()) {
			// TODO: заменить на доменную
			throw new Error('Все!');
		}

		this._usedCount += 1;

		if (this._usedCount >= this.maxUses) {
			this._usedAt = DateTime.now();
		}
	}
}
