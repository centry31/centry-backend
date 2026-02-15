export class TelegramId {
	private readonly _value: string;

	private constructor(value: string) {
		if (!/^-?\d+$/.test(value)) {
			throw new Error('Invalid Telegram id');
		}

		this._value = value;
		Object.freeze(this);
	}

	static from(input: string | number | bigint): TelegramId {
		if (typeof input === 'bigint') {
			return new TelegramId(input.toString());
		}

		if (typeof input === 'number') {
			if (!Number.isInteger(input) || !Number.isSafeInteger(input)) {
				throw new Error('Invalid Telegram id');
			}
			return new TelegramId(input.toString());
		}

		return new TelegramId(input.trim());
	}

	static fromBigInt(input: string | number | bigint): TelegramId {
		return TelegramId.from(input);
	}

	get value(): string {
		return this._value;
	}

	toBigInt(): bigint {
		return BigInt(this._value);
	}

	equals(other: TelegramId): boolean {
		return this._value === other.value;
	}

	toString(): string {
		return this._value;
	}
}
