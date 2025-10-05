import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { UsersService } from 'users/users.service';

/** Проверяет, что пользователь имеет доступ к пространству, в который посылается запрос */
@Injectable()
export class SpaceMemberAccessGuard implements CanActivate {
	constructor(private userService: UsersService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request: AuthenticatedRequest = context.switchToHttp().getRequest();

		const userId = request.user.id;

		// достаём spaceId из разных мест
		const spaceIdFromCookie = request.currentSpaceId;
		const spaceIdFromParams = request.params?.spaceId;
		const spaceIdFromBody = request.body?.spaceId;

		const targetSpaceId = spaceIdFromBody || spaceIdFromParams || spaceIdFromCookie;

		if (!targetSpaceId) {
			throw new ForbiddenException('Не указан spaceId');
		}

		const userSpacesIDs = await this.userService.getUserSpacesIDs(userId);

		if (!userSpacesIDs.includes(targetSpaceId)) {
			throw new ForbiddenException('Вы не имеете доступа к этому пространству');
		}

		return true;
	}
}
