import { DateTime } from 'common/domain/value-objects/date-time.vo';
import type { TelegramId as TgId } from 'common/domain/value-objects/telegram-id.vo';

import { MessageThreadId } from './value-objects/message-thread-id.vo';
import type { TgChatType } from './value-objects/tg-chat-type.vo';

type SpaceTgChatProps = {
	id: string;
	spaceId: string;

	chatId: TgId;
	type: TgChatType;
	title?: string;

	messageThreadId?: MessageThreadId;

	initiatedByTgId: TgId;

	isActive?: boolean;
	createdAt?: DateTime;
	updatedAt?: DateTime;
};

export class SpaceTgChat {
	public readonly id: string;
	public readonly spaceId: string;
	public readonly chatId: TgId;
	public readonly initiatedByTgId: TgId;
	public readonly createdAt?: DateTime;

	private _type: TgChatType;
	private _title?: string;
	private _messageThreadId: MessageThreadId;
	private _isActive: boolean;
	private _updatedAt?: DateTime;

	constructor(props: SpaceTgChatProps) {
		this.id = props.id;
		this.spaceId = props.spaceId;
		this.chatId = props.chatId;
		this.initiatedByTgId = props.initiatedByTgId;
		this.createdAt = props.createdAt;

		this._type = props.type;
		this._title = props.title;
		this._messageThreadId = props.messageThreadId ?? MessageThreadId.root();
		this._isActive = props.isActive ?? true;
		this._updatedAt = props.updatedAt;
	}

	get type(): TgChatType {
		return this._type;
	}

	get title(): string | undefined {
		return this._title;
	}

	get messageThreadId(): MessageThreadId {
		return this._messageThreadId;
	}

	get isActive(): boolean {
		return this._isActive;
	}

	get updatedAt(): DateTime | undefined {
		return this._updatedAt;
	}

	uniqueKey(): string {
		return `${this.chatId.value}`;
	}

	activate(now: DateTime = DateTime.now()): void {
		if (!this._isActive) {
			this._isActive = true;
			this._updatedAt = now;
		}
	}

	deactivate(now: DateTime = DateTime.now()): void {
		if (this._isActive) {
			this._isActive = false;
			this._updatedAt = now;
		}
	}

	rename(title: string | undefined, now: DateTime = DateTime.now()): void {
		if (this._title !== title) {
			this._title = title;
			this._updatedAt = now;
		}
	}

	changeType(type: TgChatType, now: DateTime = DateTime.now()): void {
		if (this._type !== type) {
			this._type = type;
			this._updatedAt = now;
		}
	}

	moveToThread(threadId: MessageThreadId, now: DateTime = DateTime.now()): void {
		if (this._messageThreadId.value !== threadId.value) {
			this._messageThreadId = threadId;
			this._updatedAt = now;
		}
	}
}
