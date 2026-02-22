import { DomainValidationError } from 'common/domain/errors/domain.error';
import type { DateTime } from 'common/domain/value-objects/date-time.vo';

/**
 * Данные конструктора доменной сущности {@link EventException}.
 */
type EventExceptionProps = {
	id: string;
	eventId: string;
	occurrenceStart: DateTime;
	createdAt: DateTime;
};

/**
 * Маркер исключения одного конкретного инстанса серии.
 *
 * По смыслу это аналог `EXDATE`:
 * `eventId + occurrenceStart` означает "не материализовывать этот слот корневой серии".
 */
export class EventException {
	public readonly id: string;
	public readonly eventId: string;
	public readonly occurrenceStart: DateTime;
	public readonly createdAt: DateTime;

	/**
	 * Создает маркер исключения и валидирует id исходной серии.
	 */
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
