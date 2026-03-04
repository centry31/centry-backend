import type { SpaceInviteCode } from '@spaces/domain/space-invite-code.entity';

export interface SpaceInviteCodeRepository {
	findOneByCode(code: string): Promise<SpaceInviteCode | null>;
	update(invite: SpaceInviteCode): Promise<void>;
	create(invite: SpaceInviteCode): Promise<SpaceInviteCode>;
	delete(spaceId: string, code: string): Promise<void>;
	findBySpaceId(spaceId: string): Promise<SpaceInviteCode[]>;
}
export const SPACE_INVITE_CODE_REPOSITORY = Symbol('SPACE_INVITE_CODE_REPOSITORY');
