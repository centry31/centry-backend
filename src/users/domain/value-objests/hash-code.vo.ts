export class HashCode {
	public readonly value: string;

	constructor(value: string) {
		const normalizedValue = value.trim();
		if (!normalizedValue) {
			throw new Error('HashCode cannot be empty');
		}
		this.value = normalizedValue;
		Object.freeze(this);
	}
}
