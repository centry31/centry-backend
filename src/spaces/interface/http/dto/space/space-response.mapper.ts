import type { Space } from '@spaces/domain/space.entity';

export type Access = 'owner' | 'member';

type SpaceResponse = {
	id: string;
	name: string;
	description?: string;
	access: Access;
};

export const toSpaceResponse = (space: Space, userId?: string): SpaceResponse => ({
	id: space.id,
	name: space.name.value,
	description: space.description,
	access: space.ownerId === userId ? 'owner' : 'member',
});
