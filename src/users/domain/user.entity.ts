import type { TgId } from './value-objests/tg-id.vo';

export class User {
	public readonly id: string;
	public readonly tgId: TgId;

	public _displayName: string;
	public _username?: string;
	public _chatId?: TgId;

	constructor(props: {
		id: string;
		tgId: TgId;
		displayName: string;
		username?: string;
		chatId?: TgId;
	}) {
		this.id = props.id;
		this.tgId = props.tgId;

		this._displayName = props.displayName.trim();
		if (this._displayName.length === 0) {
			throw new Error('Display name cannot be empty');
		}
		this._username = props.username;
		this._chatId = props.chatId;
	}

	get displayName() {
		return this._displayName;
	}
	get username() {
		return this._username;
	}
	get chatId() {
		return this._chatId;
	}
}
