import type { Space } from '@spaces/domain/space.entity';

export type Access = 'owner' | 'member';

type SpaceResponse = {
	id: string;
	name: string;
	description?: string;
	access?: Access;
	hasTelegramChats?: boolean;
};

type ToSpaceResponseParams = {
	userId?: string;
	hasTelegramChats?: boolean;
};

export const toSpaceResponse = (
	space: Space,
	params: ToSpaceResponseParams = {},
): SpaceResponse => {
	const response: SpaceResponse = {
		id: space.id,
		name: space.name.value,
		description: space.description,
	};

	if (params.userId) {
		const access = space.ownerId === params.userId ? 'owner' : 'member';
		response.access = access;
	}

	if (params.hasTelegramChats !== undefined) {
		const hasTelegramChats = params.hasTelegramChats;
		response.hasTelegramChats = hasTelegramChats;
	}

	return response;
};
