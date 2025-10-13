import { Space } from '@spaces/domain/space.entity';
import { SpaceName } from '@spaces/domain/value-objects/space-name.vo';

type SpaceRow = {
	id: string;
	name: string;
	description: string | null;
	ownerID: string;
};

export const toDomain = (row: SpaceRow): Space => {
	return new Space({
		id: row.id,
		name: new SpaceName(row.name),
		description: row.description ?? undefined,
		ownerId: row.ownerID,
	});
};

export const toPersistence = (space: Space) => {
	return {
		id: space.id,
		name: space.name.value,
		description: space.description ?? null,
		ownerID: space.ownerId,
	};
};
