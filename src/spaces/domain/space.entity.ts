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
		this._description = props.description;
	}

	// getters
	get name() {
		return this._name;
	}
	get description() {
		return this._description;
	}

	// базовые операции
	rename(newName: string) {
		this._name = new SpaceName(newName);
	}
	changeDescription(newDesc?: string) {
		this._description = newDesc;
	}
}
