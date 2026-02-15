export class MessageThreadId {
	private constructor(public readonly value: number) {}

	static from(n?: number): MessageThreadId {
		if (!n) return this.root();
		if (!Number.isInteger(n) || n < 0) throw new Error('messageThreadId must be integer >= 0');
		return new MessageThreadId(n);
	}

	static root(): MessageThreadId {
		return new MessageThreadId(0);
	}
}
