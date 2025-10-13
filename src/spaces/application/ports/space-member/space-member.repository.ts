import { SpaceMember } from '@spaces/domain/space-member.entity';

export interface SpaceMemberRepository {
	findOne(userId: string, spaceId: string): Promise<SpaceMember | null>;
	findManyBySpaceId(spaceId: string): Promise<SpaceMember[]>;
	add(member: SpaceMember): Promise<void>;
	remove(userId: string, spaceId: string): Promise<void>;
}

export const SPACE_MEMBER_REPOSITORY = Symbol('SPACE_MEMBER_REPOSITORY');
