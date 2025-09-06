import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { UsersService } from 'users/users.service';

/** Проверяет, что пользователь имеет доступ к пространству, в который посылается запрос */
@Injectable()
export class SpaceAccessGuard implements CanActivate {
	constructor(private userService: UsersService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request: AuthenticatedRequest = context.switchToHttp().getRequest();

		const currentSpaceId = request.currentSpaceId;
		const userID = request.user.id;

		const userSpacesIDs = await this.userService.getUserSpacesIDs(userID);

		if (!userSpacesIDs.includes(currentSpaceId)) {
			throw new ForbiddenException('Вы не имеете доступа к этому пространству');
		}

		return true;
	}
}
