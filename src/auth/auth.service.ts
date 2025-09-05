import { Injectable } from '@nestjs/common';
import { MagicLinksService } from 'magic-links/magic-links.service';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';

@Injectable()
export class AuthService {
	constructor(
		private readonly magicLinksService: MagicLinksService,
		private readonly jwtService: JwtService,
	) {}

	private async generateToken(user: User) {
		const payload = { id: user.id };
		return this.jwtService.sign(payload);
	}

	async loginByMagicLink(code: string) {
		const user = await this.magicLinksService.exchangeMagicLink(code);
		return this.generateToken(user);
	}
}
