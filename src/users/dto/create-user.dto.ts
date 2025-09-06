// TODO: add validation
export class CreateUserDto {
	tgId: bigint;
	chatId?: number | null;

	username?: string | null;
	displayName: string;
}
