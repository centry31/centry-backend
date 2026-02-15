export class SpaceName {
	public readonly value: string;

	constructor(value: string) {
		const normalizedValue = value.trim();
		if (!normalizedValue) {
			throw new Error('Space name cannot be empty');
		}

		this.value = normalizedValue;
		Object.freeze(this);
	}
}
