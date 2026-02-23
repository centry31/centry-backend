import { SPACE_REPOSITORY, SpaceRepository } from 'spaces/application/ports/space/space.repository';
import {
	SPACE_MEMBER_REPOSITORY,
	SpaceMemberRepository,
} from 'spaces/application/ports/space-member/space-member.repository';

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

/** Проверяет, что пользователь состоит в пространстве, к которому делает запрос */
@Injectable()
export class SpaceMemberAccessGuard implements CanActivate {
	constructor(
		@Inject(SPACE_REPOSITORY)
		private readonly spaceRepository: SpaceRepository,

		@Inject(SPACE_MEMBER_REPOSITORY)
		private readonly spaceMemberRepository: SpaceMemberRepository,
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

		const spaceMembers = await this.spaceMemberRepository.findManyBySpaceId(space.id);
		if (!spaceMembers.find((member) => member.userId === userId)) {
			throw new ForbiddenException('Вы не состоите в данном пространстве');
		}

		return true;
	}
}
