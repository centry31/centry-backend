import { SPACE_REPOSITORY, SpaceRepository } from 'spaces/application/ports/space/space.repository';

import type { CanActivate, ExecutionContext } from '@nestjs/common';
import {
	BadRequestException,
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from 'common/types/authenticated-request.interface';

/** Проверяет, что пользователь владеет пространством, к которому делает запрос */
@Injectable()
export class SpaceOwnerAccessGuard implements CanActivate {
	constructor(
		@Inject(SPACE_REPOSITORY)
		private readonly spaceRepository: SpaceRepository,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request: AuthenticatedRequest = context.switchToHttp().getRequest();

		const userId = request.user?.id;
		if (!userId) throw new UnauthorizedException();

		const targetSpaceId = request.params?.spaceId;
		if (!targetSpaceId) throw new BadRequestException('Не указан spaceId');

		const space = await this.spaceRepository.findById(targetSpaceId);
		if (!space) {
			throw new NotFoundException('Такое пространство не найдено');
		}
		if (space.ownerId !== userId) {
			throw new ForbiddenException('У вас нет прав для управления этим пространством');
		}

		return true;
	}
}
