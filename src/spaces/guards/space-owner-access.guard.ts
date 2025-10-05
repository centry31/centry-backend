import {
	Injectable,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common';
import { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { SpacesService } from '../spaces.service';

/** Проверяет, что пользователь владеет пространством, к которому делает запрос */
@Injectable()
export class SpaceOwnerAccessGuard implements CanActivate {
	constructor(private spaceService: SpacesService) {}

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

		const space = await this.spaceService.getOne(targetSpaceId);
		if (!space) {
			throw new NotFoundException('Такое пространство не найдено');
		}
		if (space.ownerID !== userId) {
			throw new ForbiddenException('У вас нет прав для управления этим пространством');
		}

		return true;
	}
}
