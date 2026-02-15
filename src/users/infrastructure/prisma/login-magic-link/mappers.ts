import { LoginMagicLink } from '@users/domain/login-magic-link.entity';
import { HashCode } from '@users/domain/value-objests/hash-code.vo';
import { DateTime } from 'common/domain/value-objects/date-time.vo';

type Row = {
	id: string;
	userId: string;
	hashCode: string;
	createdAt: Date;
	expiresAt: Date;
	usedAt: Date | null;
};

export const toDomain = (row: Row) =>
	new LoginMagicLink({
		id: row.id,
		userId: row.userId,
		hashCode: new HashCode(row.hashCode),
		createdAt: DateTime.fromDate(row.createdAt),
		expiresAt: DateTime.fromDate(row.expiresAt),
		usedAt: row.usedAt ? DateTime.fromDate(row.usedAt) : undefined,
	});

export const toPersistence = (loginMagicLink: LoginMagicLink): Row => ({
	id: loginMagicLink.id,
	userId: loginMagicLink.userId,
	hashCode: loginMagicLink.hashCode.value,
	createdAt: loginMagicLink.createdAt.value,
	expiresAt: loginMagicLink.expiresAt.value,
	usedAt: loginMagicLink.usedAt?.value ?? null,
});
