// TODO: add validation
export class CreateUserDto {
	tgId: number;
	chatId?: number | null;

	username?: string | null;
	displayName: string;
}
