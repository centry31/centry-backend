import { DomainValidationError } from 'common/domain/errors/domain.error';

type EventOverrideProps = {
	id: string;
	eventId: string;
	orderIndex: number;
	offset: number;
	isDeleted: boolean;
	isOffsetOnce: boolean;
};

export class EventOverride {
	public readonly id: string;
	public readonly eventId: string;
	public readonly orderIndex: number;
	public readonly offset: number;
	public readonly isDeleted: boolean;
	public readonly isOffsetOnce: boolean;

	constructor(props: EventOverrideProps) {
		if (!Number.isInteger(props.orderIndex) || props.orderIndex < 0) {
			throw new DomainValidationError('orderIndex must be an integer >= 0');
		}
		if (!Number.isInteger(props.offset)) {
			throw new DomainValidationError('offset must be an integer');
		}

		this.id = props.id;
		this.eventId = props.eventId;
		this.orderIndex = props.orderIndex;
		this.offset = props.offset;
		this.isDeleted = props.isDeleted;
		this.isOffsetOnce = props.isOffsetOnce;
	}

	isOne(): boolean {
		return this.isOffsetOnce;
	}

	isFuture(): boolean {
		return !this.isOffsetOnce;
	}
}
