import type { TokenService } from '@users/application/ports/jwt/token.service';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtTokenService implements TokenService {
	constructor(private readonly jwt: JwtService) {}

	sign(payload: object, opts?: { expiresIn?: string | number }): string {
		return this.jwt.sign(payload, opts);
	}

	verify<T extends object>(token: string): T {
		return this.jwt.verify<T>(token);
	}
}
