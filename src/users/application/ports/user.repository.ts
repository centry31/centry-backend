import { User } from '@users/domain/user.entity';

export interface UserRepository {
	findById(id: string): Promise<User | null>;
	findByTgId(tgId: string): Promise<User | null>;
	create(user: User): Promise<User>;
	update(user: User): Promise<void>;
}
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
