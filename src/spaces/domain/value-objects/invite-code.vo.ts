export class InviteCode {
	public readonly value: string;

	// TODO: закинуть валидацию когда-нибудь
	constructor(value: string) {
		const normalizedValue = value.trim();
		if (!normalizedValue) {
			throw new Error('InviteCode cannot be empty');
		}
		this.value = normalizedValue;
	}
}
