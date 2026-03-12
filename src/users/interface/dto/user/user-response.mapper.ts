import type { User } from '@users/domain/user.entity';

type UserResponse = {
	id: string;
	username?: string;
	displayName: string;
	isOnboardingCompleted: boolean;
};

export const toUserResponse = (user: User): UserResponse => ({
	id: user.id,
	username: user.username,
	displayName: user.displayName,
	isOnboardingCompleted: user.isOnboardingCompleted,
});
