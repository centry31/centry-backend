import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type JwtPayload = {
	id: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(private jwtService: JwtService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest();

		try {
			const authHeader = req.headers.authorization;

			const bearer = authHeader.split(' ')[0];
			const token = authHeader.split(' ')[1];

			if (bearer !== 'Bearer' || !token) {
				throw new UnauthorizedException({ message: 'Пользователь не авторизован' });
			}

			/** Расшифровываю информацию из jwt токена */
			const decodedToken = this.jwtService.verify<JwtPayload>(token);

			/** Кладу информацию для работы с endpoints в поле user */
			req.user = decodedToken;

			const currentSpaceId = req.cookies['currentSpaceId'];
			req.currentSpaceId = currentSpaceId;

			return true;
		} catch (e) {
			console.error(e);
			throw new UnauthorizedException({ message: 'Пользователь не авторизован' });
		}
	}
}
