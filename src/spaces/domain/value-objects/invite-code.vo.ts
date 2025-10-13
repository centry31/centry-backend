export class InviteCode {
	public readonly value: string;

	// TODO: закинуть валидацию когда-нибудь
	constructor(value: string) {
		this.value = value;
	}
}
