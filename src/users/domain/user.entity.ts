import type { TgId } from './value-objests/tg-id.vo';

export class User {
	public readonly id: string;
	public readonly tgId: TgId;
	public displayName: string;
	public username?: string;
	public chatId?: TgId;

	constructor(props: {
		id: string;
		tgId: TgId;
		displayName: string;
		username?: string;
		chatId?: TgId;
	}) {
		this.id = props.id;
		this.tgId = props.tgId;
		this.displayName = props.displayName.trim();
		if (this.displayName.length === 0) {
			throw new Error('Display name cannot be empty');
		}
		this.username = props.username;
		this.chatId = props.chatId;
	}
}
