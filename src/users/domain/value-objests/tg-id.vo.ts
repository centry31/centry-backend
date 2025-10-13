export class TgId {
	// Храним как string, чтобы не упасть на BigInt в разных рантаймах/JSON
	constructor(public readonly value: string) {
		if (!/^\d+$/.test(value)) throw new Error('Invalid Telegram id');
	}

	static fromBigInt(bi: bigint | number | string): TgId {
		return new TgId(String(bi));
	}
}
