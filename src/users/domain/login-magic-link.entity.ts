import { DomainValidationError } from 'common/domain/errors/domain.error';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

import type { HashCode } from './value-objests/hash-code.vo';

type LoginMagicLinkProps = {
	id: string;
	hashCode: HashCode;
	userId: string;
	expiresAt: DateTime;
	usedAt?: DateTime;
	createdAt: DateTime;
};

export class LoginMagicLink {
	public readonly id: string;
	public readonly hashCode: HashCode;
	public readonly userId: string;
	public readonly expiresAt: DateTime;
	public readonly createdAt: DateTime;

	private _usedAt?: DateTime;

	constructor(props: LoginMagicLinkProps) {
		this.id = props.id;
		this.hashCode = props.hashCode;
		this.userId = props.userId;
		this.expiresAt = props.expiresAt;
		this.createdAt = props.createdAt;
		this._usedAt = props.usedAt;

		if (this.expiresAt.isSameOrBefore(this.createdAt)) {
			throw new DomainValidationError('expiresAt must be after createdAt');
		}
	}

	get usedAt(): DateTime | undefined {
		return this._usedAt;
	}

	isExpired(now: DateTime = DateTime.now()): boolean {
		return now.isSameOrAfter(this.expiresAt);
	}

	canBeUsed(now: DateTime = DateTime.now()): boolean {
		if (this._usedAt) return false;
		if (this.isExpired(now)) return false;
		return true;
	}

	markUsed(now: DateTime = DateTime.now()): void {
		if (!this.canBeUsed(now)) {
			return;
		}
		this._usedAt = now;
	}
}
