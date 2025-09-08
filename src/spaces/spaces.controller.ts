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
import { SpacesService } from './spaces.service';
import { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { plainToInstance } from 'class-transformer';
import { formatResponse } from 'common/utils/response.util';
import { CreateSpaceDto } from './dto/create-space.dto';
import { SpaceDto } from './dto/space.dto';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { UserDto } from 'users/dto/user.dto';
import { UpdateSpaceDto } from 'spaces/dto/update-space-dto';

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

		const createdSpace = await this.spacesService.createSpace(createSpaceDto, user.id);
		const validatedCreatedSpace = plainToInstance(SpaceDto, createdSpace, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedCreatedSpace, 'Пространство успешно создано');
	}

	@Get()
	async getPersonalUserSpaces(@Request() req: AuthenticatedRequest) {
		const { user } = req;

		const spaces = await this.spacesService.getPersonalUserSpaces(user.id);
		const validatedSpaces = plainToInstance(SpaceDto, spaces, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedSpaces, 'Пространства пользователя успешно получены');
	}

	@Get('users/:spaceId')
	async getSpaceMembers(@Param('spaceId') spaceId: string) {
		const members = await this.spacesService.getSpaceMembers(spaceId);
		const validatedMembers = plainToInstance(UserDto, members, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedMembers, 'Участники пространства успешно получены');
	}

	@Get(':spaceId')
	async getSpace(@Param('spaceId') spaceId: string) {
		const space = await this.spacesService.getSpace(spaceId);
		const validatedSpace = plainToInstance(SpaceDto, space, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedSpace, 'Пространство успешно получено');
	}

	@Patch(':spaceId')
	async updateSpaceInfo(
		@Body() updateSpaceDto: UpdateSpaceDto,
		@Request() req: AuthenticatedRequest,
		@Param('spaceId') spaceId: string,
	) {
		const { user } = req;

		const updatedSpace = await this.spacesService.updateSpaceInfo(
			updateSpaceDto,
			spaceId,
			user.id,
		);
		const validatedUpdatedSpace = plainToInstance(SpaceDto, updatedSpace, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedUpdatedSpace, 'Пространство успешно обновлено');
	}

	@Delete(':spaceId')
	async deleteSpace(@Request() req: AuthenticatedRequest, @Param('spaceId') spaceId: string) {
		const { user } = req;

		const deletedSpace = await this.spacesService.deleteSpace(spaceId, user.id);
		const validatedDeletedSpace = plainToInstance(SpaceDto, deletedSpace, {
			excludeExtraneousValues: true,
		});
		return formatResponse(validatedDeletedSpace, 'Пространство успешно удалено');
	}
}
