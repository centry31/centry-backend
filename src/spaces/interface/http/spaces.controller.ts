import { CreateSpaceUseCase } from '@spaces/application/use-cases/space/create-space.use-case';
import { DeleteSpaceUseCase } from '@spaces/application/use-cases/space/delete-space.use-case';
import { GetSpaceUseCase } from '@spaces/application/use-cases/space/get-space.use-case';
import { GetUserSpacesUseCase } from '@spaces/application/use-cases/space/get-user-spaces.use-case';
import { UpdateSpaceUseCase } from '@spaces/application/use-cases/space/update-space.use-case';

import { SpaceOwnerAccessGuard } from '../guard/space-owner-access.guard';
import { CreateSpaceDto } from './dto/space/create-space.dto';
import { toSpaceResponse } from './dto/space/space-response.mapper';
import { UpdateSpaceDto } from './dto/space/update-space.dto';

import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Request,
	UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';
import { SpaceMemberAccessGuard } from 'spaces';
import { JwtAuthGuard } from 'users';

@UseGuards(JwtAuthGuard)
@Controller('spaces')
export class SpacesController {
	constructor(
		private readonly createSpaceUseCase: CreateSpaceUseCase,
		private readonly getUserSpacesUseCase: GetUserSpacesUseCase,
		private readonly getSpaceUseCase: GetSpaceUseCase,
		private readonly updateSpaceUseCase: UpdateSpaceUseCase,
		private readonly deleteSpaceUseCase: DeleteSpaceUseCase,
	) {}

	@Post()
	async create(@Body() createSpaceDto: CreateSpaceDto, @Request() req: AuthenticatedRequest) {
		const { user } = req;
		const space = await this.createSpaceUseCase.execute({
			name: createSpaceDto.name,
			description: createSpaceDto.description,
			ownerId: user.id,
		});
		const response = toSpaceResponse(space, { userId: user.id, hasTelegramChats: false });
		return formatResponse(response, 'Пространство создано');
	}

	@Get()
	async getUserSpaces(@Request() req: AuthenticatedRequest) {
		const { user } = req;
		const spaces = await this.getUserSpacesUseCase.execute({ userId: user.id });
		const response = spaces.map((item) =>
			toSpaceResponse(item.space, {
				userId: user.id,
				hasTelegramChats: item.hasTelegramChats,
			}),
		);
		return formatResponse(response, 'Пространства пользователя получены');
	}

	@UseGuards(SpaceMemberAccessGuard)
	@Get(':spaceId')
	async get(@Param('spaceId') spaceId: string, @Request() req: AuthenticatedRequest) {
		const { user } = req;
		const { space, hasTelegramChats } = await this.getSpaceUseCase.execute({ spaceId });
		const response = toSpaceResponse(space, { userId: user.id, hasTelegramChats });
		return formatResponse(response, 'Пространство получено');
	}

	@UseGuards(SpaceOwnerAccessGuard)
	@Patch(':spaceId')
	async update(
		@Body() updateSpaceDto: UpdateSpaceDto,
		@Param('spaceId') spaceId: string,
		@Request() req: AuthenticatedRequest,
	) {
		const { user } = req;
		await this.updateSpaceUseCase.execute({
			spaceId,
			ownerId: user.id,
			name: updateSpaceDto.name,
			description: updateSpaceDto.description,
		});
		return formatResponse(null, 'Пространство обновлено');
	}

	@UseGuards(SpaceOwnerAccessGuard)
	@Delete(':spaceId')
	async delete(@Param('spaceId') spaceId: string) {
		await this.deleteSpaceUseCase.execute({ spaceId });
		return formatResponse(null, 'Пространство удалено');
	}
}
