import { User } from 'users/domain/user.entity';
import { TgId } from 'users/domain/value-objests/tg-id.vo';

type Row = {
	id: string;
	tgId: bigint;
	chatId: bigint | null;
	username: string | null;
	displayName: string;
};

export const toDomain = (r: Row): User =>
	new User({
		id: r.id,
		tgId: TgId.fromBigInt(r.tgId),
		displayName: r.displayName,
		username: r.username,
		chatId: r.chatId != null ? TgId.fromBigInt(r.chatId) : undefined,
	});

export const toPersistence = (u: User): Row => ({
	id: u.id,
	tgId: BigInt(u.tgId.value),
	chatId: u.chatId ? BigInt(u.chatId.value) : null,
	username: u.username ?? null,
	displayName: u.displayName,
});
