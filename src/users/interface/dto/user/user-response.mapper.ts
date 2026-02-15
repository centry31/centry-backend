import type { User } from '@users/domain/user.entity';

type UserResponse = {
	id: string;
	username?: string;
	displayName: string;
};

export const toUserResponse = (user: User): UserResponse => ({
	id: user.id,
	username: user.username,
	displayName: user._displayName,
});
