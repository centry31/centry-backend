export class ExpiresAt {
	public readonly value: Date;

	constructor(date: Date) {
		if (date <= new Date()) {
			throw new Error('Invite code expiry must be in the future');
		}
		this.value = date;
	}

	isExpired(): boolean {
		return new Date() > this.value;
	}
}
