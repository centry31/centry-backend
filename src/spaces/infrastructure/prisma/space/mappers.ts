import { Space } from '@spaces/domain/space.entity';
import { SpaceName } from '@spaces/domain/value-objects/space-name.vo';

export type SpaceRow = {
	id: string;
	name: string;
	description: string | null;
	ownerId: string;
};

export const toSpaceDomain = (row: SpaceRow): Space => {
	return new Space({
		id: row.id,
		name: new SpaceName(row.name),
		description: row.description,
		ownerId: row.ownerId,
	});
};

export const toSpacePersistence = (space: Space): SpaceRow => {
	return {
		id: space.id,
		name: space.name.value,
		description: space.description,
		ownerId: space.ownerId,
	};
};
