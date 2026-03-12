import { TelegramId as TgId } from 'common/domain/value-objects/telegram-id.vo';
import { User } from 'users/domain/user.entity';

type Row = {
	id: string;
	tgId: bigint;
	chatId: bigint | null;

	username: string | null;
	displayName: string;
	isOnboardingCompleted: boolean;
};

export const toDomain = (r: Row): User =>
	new User({
		id: r.id,
		tgId: TgId.fromBigInt(r.tgId),
		chatId: r.chatId != null ? TgId.fromBigInt(r.chatId) : undefined,

		username: r.username,
		displayName: r.displayName,
		isOnboardingCompleted: r.isOnboardingCompleted,
	});

export const toPersistence = (u: User): Row => ({
	id: u.id,
	tgId: u.tgId.toBigInt(),
	chatId: u.chatId ? u.chatId.toBigInt() : null,

	username: u.username ?? null,
	displayName: u.displayName,
	isOnboardingCompleted: u.isOnboardingCompleted,
});
