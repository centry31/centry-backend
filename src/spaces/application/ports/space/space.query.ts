import type { Space } from '@spaces/domain/space.entity';

export interface SpaceQuery {
	findById(spaceId: string): Promise<Space | null>;
}
export const SPACE_QUERY = Symbol('SPACE_QUERY');
