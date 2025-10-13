export type UpdateSpaceCommand = {
	spaceId: string;
	ownerId: string;
	name: string;
	description?: string;
};
