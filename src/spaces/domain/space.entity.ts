import { SpaceName } from './value-objects/space-name.vo';
import { SpaceMember } from './space-member.entity';

export class Space {
	public readonly id: string;
	public name: SpaceName;
	public description?: string;
	public readonly ownerId: string;

	constructor(props: {
		id: string;
		name: SpaceName;
		ownerId: string;
		description?: string;
		members?: SpaceMember[];
	}) {
		this.id = props.id;
		this.name = props.name;
		this.description = props.description;
		this.ownerId = props.ownerId;
	}

	rename(newName: string) {
		this.name = new SpaceName(newName);
	}
	changeDescription(newDesc?: string) {
		this.description = newDesc;
	}
}
