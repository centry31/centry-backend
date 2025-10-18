import { LoginMagicLink } from '@users/domain/login-magic-link.entity';
import { DateTime } from '@users/domain/value-objests/date-time.vo';
import { HashCode } from '@users/domain/value-objests/hash-code.vo';

type Row = {
	id: string;
	userId: string;
	hashCode: string;
	createdAt: Date;
	expiresAt: Date;
	usedAt?: Date;
};

export const toDomain = (row: Row) =>
	new LoginMagicLink({
		id: row.id,
		userId: row.userId,
		hashCode: new HashCode(row.hashCode),
		createdAt: new DateTime(row.createdAt),
		expiresAt: new DateTime(row.expiresAt),
		usedAt: new DateTime(row.usedAt),
	});

export const toPersistence = (loginMagicLink: LoginMagicLink): Row => ({
	id: loginMagicLink.id,
	userId: loginMagicLink.userId,
	hashCode: loginMagicLink.hashCode.value,
	createdAt: loginMagicLink.createdAt.value,
	expiresAt: loginMagicLink.expiresAt.value,
	usedAt: loginMagicLink.usedAt,
});
