import type { Space } from '@spaces/domain/space.entity';

type SpaceResponse = {
	id: string;
	name: string;
	description?: string;
};

export const toSpaceResponse = (space: Space): SpaceResponse => ({
	id: space.id,
	name: space.name.value,
	description: space.description,
});
