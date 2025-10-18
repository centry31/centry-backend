export class HashCode {
	public readonly value: string;

	constructor(value: string) {
		if (!value || value.trim().length === 0) {
			throw new Error('HashCode cannot be empty');
		}
		this.value = value;
	}
}
