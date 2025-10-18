import type { Space } from '@spaces/domain/space.entity';

export interface SpaceRepository {
	create(space: Space): Promise<Space>;
	update(space: Space): Promise<void>;
	delete(spaceId: string): Promise<void>;

	findById(id: string): Promise<Space | null>;
	findManyByOwnerId(id: string): Promise<Space[]>;
	findManyByMembershipUserId(userId: string): Promise<Space[]>;
}
export const SPACE_REPOSITORY = Symbol('SPACE_REPOSITORY');
