export class SpaceName {
	public readonly value: string;

	constructor(value: string) {
		const trimmed = value.trim();
		if (trimmed.length === 0) {
			throw new Error('Space name cannot be empty');
		}
		// Можно добавить ограничения длины, запрещённые символы и т.д.
		this.value = trimmed;
	}
}
