export class TgId {
	private constructor(public readonly value: bigint) {
		if (typeof value !== 'bigint') throw new Error('TgId must be bigint');
	}

	static from(input: string | number | bigint): TgId {
		if (typeof input === 'bigint') return new TgId(input);
		if (typeof input === 'number' && Number.isInteger(input)) {
			return new TgId(BigInt(input));
		}
		if (typeof input === 'string' && /^\d+$/.test(input)) return new TgId(BigInt(input));

		throw new Error('Invalid TgChatId');
	}
}
