export interface UserQuery {
	findByIds(
		ids: string[],
	): Promise<Array<{ id: string; username: string | null; displayName: string }>>;
}
export const USER_QUERY = Symbol('USER_QUERY');
