type SpaceMemberProps = {
	userId: string;
	spaceId: string;
};

export class SpaceMember {
	public readonly userId: string;
	public readonly spaceId: string;

	constructor(props: SpaceMemberProps) {
		if (!props.userId.trim()) {
			throw new Error('SpaceMember.userId cannot be empty');
		}
		if (!props.spaceId.trim()) {
			throw new Error('SpaceMember.spaceId cannot be empty');
		}

		this.userId = props.userId;
		this.spaceId = props.spaceId;
	}
}
