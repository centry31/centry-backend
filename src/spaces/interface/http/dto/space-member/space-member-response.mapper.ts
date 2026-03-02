type SpaceMemberQuery = {
	id: string;
	username: string;
	displayName: string;
};

type SpaceMemberResponse = {
	id: string;
	username: string;
	displayName: string;
};

export const toSpaceMemberResponse = (spaceMember: SpaceMemberQuery): SpaceMemberResponse => {
	return {
		id: spaceMember.id,
		username: spaceMember.username,
		displayName: spaceMember.displayName,
	};
};
