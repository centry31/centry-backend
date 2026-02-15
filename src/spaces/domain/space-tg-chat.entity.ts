import { DateTime } from './value-objects/date-time.vo';
import { MessageThreadId } from './value-objects/message-thread-id.vo';
import type { TgId } from './value-objects/tg-chat-id.vo';
import type { TgChatType } from './value-objects/tg-chat-type.vo';

type Props = {
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

	constructor(props: Props) {
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

	// getters
	get type() {
		return this._type;
	}
	get title() {
		return this._title;
	}
	get messageThreadId() {
		return this._messageThreadId;
	}
	get isActive() {
		return this._isActive;
	}
	get updatedAt() {
		return this._updatedAt;
	}

	// ключ уникальности: (chatId)
	uniqueKey(): string {
		return `${this.chatId.value}`;
	}

	// поведение
	activate(now = DateTime.now()) {
		if (!this._isActive) {
			this._isActive = true;
			this._updatedAt = now;
		}
	}
	deactivate(now = DateTime.now()) {
		if (this._isActive) {
			this._isActive = false;
			this._updatedAt = now;
		}
	}

	rename(title: string | undefined, now = DateTime.now()) {
		if (this._title !== title) {
			this._title = title;
			this._updatedAt = now;
		}
	}

	changeType(type: TgChatType, now = DateTime.now()) {
		if (this._type !== type) {
			this._type = type;
			this._updatedAt = now;
		}
	}

	moveToThread(threadId: MessageThreadId, now = DateTime.now()) {
		if (this._messageThreadId.value !== threadId.value) {
			this._messageThreadId = threadId;
			this._updatedAt = now;
		}
	}
}
