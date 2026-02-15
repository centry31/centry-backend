import { DateTime } from './value-objests/date-time.vo';
import type { HashCode } from './value-objests/hash-code.vo';

interface MagicLinkProps {
	id: string;
	hashCode: HashCode;
	userId: string;
	expiresAt: DateTime;
	usedAt?: DateTime;
	createdAt: DateTime;
}

export class LoginMagicLink {
	public readonly id: string;
	public readonly hashCode: HashCode;
	public readonly userId: string;
	public readonly expiresAt: DateTime;
	public readonly createdAt: DateTime;

	private _usedAt?: DateTime;

	constructor(props: MagicLinkProps) {
		this.id = props.id;
		this.hashCode = props.hashCode;
		this.userId = props.userId;
		this.expiresAt = props.expiresAt;
		this.createdAt = props.createdAt;

		if (props.usedAt) {
			this._usedAt = props.usedAt;
		}
	}

	get usedAt(): Date | undefined {
		return this._usedAt?.value;
	}

	isExpired(now: DateTime = DateTime.now()): boolean {
		return now.isBefore(this.expiresAt) === false;
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
