import { Body, Controller, Delete, Get, Param, Patch, Post, Request } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';

import { CreateSpaceUseCase } from '@spaces/application/use-cases/space/create-space.use-case';
import { GetUserSpacesUseCase } from '@spaces/application/use-cases/space/get-user-spaces.use-case';
import { GetSpaceUseCase } from '@spaces/application/use-cases/space/get-space.use-case';
import { UpdateSpaceUseCase } from '@spaces/application/use-cases/space/update-space.use-case';
import { DeleteSpaceUseCase } from '@spaces/application/use-cases/space/delete-space.use-case';

import { CreateSpaceDto } from './dto/space/create-space.dto';
import { SpaceResponseDto } from './dto/space/space-response.dto';
import { UpdateSpaceDto } from 'spaces/interface/http/dto/space/update-space.dto';

// TODO: добавить гварды!!!
@Controller('spaces')
export class SpacesController {
	constructor(
		private readonly createSpaceInviteCodeUseCase: CreateSpaceUseCase,
		private readonly getUserSpacesUseCase: GetUserSpacesUseCase,
		private readonly getSpaceUseCase: GetSpaceUseCase,
		private readonly updateSpaceUseCase: UpdateSpaceUseCase,
		private readonly deleteSpaceUseCase: DeleteSpaceUseCase,
	) {}

	@Post()
	async create(@Body() createSpaceDto: CreateSpaceDto, @Request() req: AuthenticatedRequest) {
		const { user } = req;
		const space = await this.createSpaceInviteCodeUseCase.execute({
			name: createSpaceDto.name,
			description: createSpaceDto.description,
			ownerId: user.id,
		});
		const responseDto = plainToInstance(SpaceResponseDto, space, {
			excludeExtraneousValues: true,
		});
		return formatResponse(responseDto, 'Пространство создано');
	}

	@Get()
	async getUserSpaces(@Request() req: AuthenticatedRequest) {
		const { user } = req;
		const spaces = await this.getUserSpacesUseCase.execute({ userId: user.id });
		const responseDto = spaces.map((space) =>
			plainToInstance(SpaceResponseDto, space, { excludeExtraneousValues: true }),
		);
		return formatResponse(responseDto, 'Пространства пользователя получены');
	}

	@Get(':spaceId')
	async get(@Param('spaceId') spaceId: string) {
		const space = await this.getSpaceUseCase.execute({ spaceId });
		const responseDto = plainToInstance(SpaceResponseDto, space, {
			excludeExtraneousValues: true,
		});
		return formatResponse(responseDto, 'Пространство получено');
	}

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

	@Delete(':spaceId')
	async delete(@Param('spaceId') spaceId: string) {
		await this.deleteSpaceUseCase.execute({ spaceId });
		return formatResponse(null, 'Пространство удалено');
	}
}
