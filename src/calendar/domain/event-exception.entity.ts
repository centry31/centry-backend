import { DomainValidationError } from 'common/domain/errors/domain.error';
import type { DateTime } from 'common/domain/value-objects/date-time.vo';

type EventExceptionProps = {
	id: string;
	eventId: string;
	occurrenceStart: DateTime;
	createdAt: DateTime;
};

export class EventException {
	public readonly id: string;
	public readonly eventId: string;
	public readonly occurrenceStart: DateTime;
	public readonly createdAt: DateTime;

	constructor(props: EventExceptionProps) {
		if (!props.eventId.trim()) {
			throw new DomainValidationError('eventId cannot be empty');
		}

		this.id = props.id;
		this.eventId = props.eventId;
		this.occurrenceStart = props.occurrenceStart;
		this.createdAt = props.createdAt;
	}
}
