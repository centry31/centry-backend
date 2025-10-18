import type { LoginMagicLink } from '@users/domain/login-magic-link.entity';

export interface LoginMagicLinkRepository {
	create(loginMagicLink: LoginMagicLink): Promise<LoginMagicLink>;
	findById(id: string): Promise<LoginMagicLink | null>;
	findByHashCode(hashCode: string): Promise<LoginMagicLink | null>;
	update(loginMagicLink: LoginMagicLink): Promise<void>;
}
export const LOGIN_MAGIC_LINK_REPOSITORY = Symbol('LOGIN_MAGIC_LINK_REPOSITORY');
