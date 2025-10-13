export type RegisterUserCommand = {
	tgId: string | number | bigint;
	displayName: string;
	username?: string | null;
};
