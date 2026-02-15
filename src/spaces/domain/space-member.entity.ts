import { DomainValidationError } from 'common/domain/errors/domain.error';

type SpaceMemberProps = {
	userId: string;
	spaceId: string;
};

export class SpaceMember {
	public readonly userId: string;
	public readonly spaceId: string;

	constructor(props: SpaceMemberProps) {
		if (!props.userId.trim()) {
			throw new DomainValidationError('SpaceMember.userId cannot be empty');
		}
		if (!props.spaceId.trim()) {
			throw new DomainValidationError('SpaceMember.spaceId cannot be empty');
		}

		this.userId = props.userId;
		this.spaceId = props.spaceId;
	}
}
