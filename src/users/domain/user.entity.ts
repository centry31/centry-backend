import type { TelegramId as TgId } from 'common/domain/value-objects/telegram-id.vo';

type UserProps = {
	id: string;
	tgId: TgId;
	displayName: string;
	username?: string;
	chatId?: TgId;
};

export class User {
	public readonly id: string;
	public readonly tgId: TgId;

	private _displayName: string;
	private _username?: string;
	private _chatId?: TgId;

	constructor(props: UserProps) {
		this.id = props.id;
		this.tgId = props.tgId;
		this.changeDisplayName(props.displayName);
		this.changeUsername(props.username);
		this.changeChatId(props.chatId);
	}

	get displayName(): string {
		return this._displayName;
	}

	get username(): string | undefined {
		return this._username;
	}

	get chatId(): TgId | undefined {
		return this._chatId;
	}

	changeDisplayName(displayName: string): void {
		const normalizedDisplayName = displayName.trim();
		if (!normalizedDisplayName) {
			throw new Error('Display name cannot be empty');
		}

		this._displayName = normalizedDisplayName;
	}

	changeUsername(username?: string | null): void {
		const normalizedUsername = username?.trim();
		this._username = normalizedUsername ? normalizedUsername : undefined;
	}

	changeChatId(chatId?: TgId): void {
		this._chatId = chatId;
	}
}
