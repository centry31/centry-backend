export class SpaceMember {
	public readonly userId: string;
	public readonly spaceId: string;

	constructor(props: { userId: string; spaceId: string }) {
		this.userId = props.userId;
		this.spaceId = props.spaceId;
	}
}
