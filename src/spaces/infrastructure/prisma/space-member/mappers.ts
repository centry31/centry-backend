import { SpaceMember } from '@spaces/domain/space-member.entity';

type Row = {
	userId: string;
	spaceId: string;
};

export const toDomain = (row: Row): SpaceMember => {
	return new SpaceMember({ userId: row.userId, spaceId: row.spaceId });
};
