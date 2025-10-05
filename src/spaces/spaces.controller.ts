import { Body, Controller, Delete, Get, Param } from '@nestjs/common';
import { Patch, Post, Request, UseGuards } from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { plainToInstance } from 'class-transformer';
import { formatResponse } from 'common/utils/response.util';
import { CreateSpaceDto } from './dto/create-space.dto';
import { SpaceDto } from './dto/space.dto';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { UserDto } from 'users/dto/user.dto';
import { UpdateSpaceDto } from 'spaces/dto/update-space-dto';
import { SpaceOwnerAccessGuard } from './guards/space-owner-access.guard';

@Controller('spaces')
@UseGuards(JwtAuthGuard)
export class SpacesController {
	constructor(private readonly spacesService: SpacesService) {}

	@Post()
	async createSpace(
		@Body() createSpaceDto: CreateSpaceDto,
		@Request() req: AuthenticatedRequest,
	) {
		const { user } = req;

		const createdSpace = await this.spacesService.create(createSpaceDto, user.id);
		const validatedCreatedSpace = plainToInstance(SpaceDto, createdSpace, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedCreatedSpace, 'Пространство успешно создано');
	}

	@Get()
	async getPersonalUserSpaces(@Request() req: AuthenticatedRequest) {
		const { user } = req;

		const spaces = await this.spacesService.getListByUserId(user.id);
		const enrichedSpaces = await Promise.all(
			spaces.map((space) => this.spacesService.enrich(space, user.id)),
		);

		const validatedSpaces = plainToInstance(SpaceDto, enrichedSpaces, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedSpaces, 'Пространства пользователя успешно получены');
	}

	@Get('users/:spaceId')
	async getSpaceMembers(@Param('spaceId') spaceId: string) {
		const members = await this.spacesService.getMembers(spaceId);
		const validatedMembers = plainToInstance(UserDto, members, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedMembers, 'Участники пространства успешно получены');
	}

	@Get(':spaceId')
	async getSpace(@Param('spaceId') spaceId: string, @Request() req: AuthenticatedRequest) {
		const { user } = req;

		const space = await this.spacesService.getOne(spaceId);
		const enrichedSpace = await this.spacesService.enrich(space, user.id);
		const validatedSpace = plainToInstance(SpaceDto, enrichedSpace, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedSpace, 'Пространство успешно получено');
	}

	@Patch(':spaceId')
	@UseGuards(SpaceOwnerAccessGuard)
	async updateSpaceInfo(
		@Body() updateSpaceDto: UpdateSpaceDto,
		@Param('spaceId') spaceId: string,
	) {
		const updatedSpace = await this.spacesService.updateInfo(updateSpaceDto, spaceId);
		const validatedUpdatedSpace = plainToInstance(SpaceDto, updatedSpace, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedUpdatedSpace, 'Пространство успешно обновлено');
	}

	@Delete(':spaceId')
	@UseGuards(SpaceOwnerAccessGuard)
	async deleteSpace(@Param('spaceId') spaceId: string) {
		const deletedSpace = await this.spacesService.delete(spaceId);
		const validatedDeletedSpace = plainToInstance(SpaceDto, deletedSpace, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedDeletedSpace, 'Пространство успешно удалено');
	}

	@Delete('leave/:spaceId')
	async leaveSpace(@Param('spaceId') spaceId: string, @Request() req: AuthenticatedRequest) {
		const { user } = req;

		await this.spacesService.leave(spaceId, user.id);
		return formatResponse(null, 'Пользователь успешно покинул пространство');
	}
}
