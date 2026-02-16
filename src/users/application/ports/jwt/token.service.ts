export interface TokenService {
	sign(payload: object, opts?: { expiresIn?: string | number }): string;
	verify<T extends object>(token: string): T;
}
export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');
