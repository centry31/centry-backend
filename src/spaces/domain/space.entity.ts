import { SpaceName } from './value-objects/space-name.vo';

type Props = {
	id: string;
	name: SpaceName;
	ownerId: string;
	description?: string;
};

export class Space {
	public readonly id: string;
	public readonly ownerId: string;

	private _name: SpaceName;
	private _description?: string;

	constructor(props: Props) {
		this.id = props.id;
		this.ownerId = props.ownerId;

		this._name = props.name;
		this.changeDescription(props.description);
	}

	get name(): SpaceName {
		return this._name;
	}

	get description(): string | undefined {
		return this._description;
	}

	rename(newName: string): void {
		this._name = new SpaceName(newName);
	}

	changeDescription(newDescription?: string): void {
		const normalizedDescription = newDescription?.trim();
		this._description = normalizedDescription ? normalizedDescription : undefined;
	}
}
