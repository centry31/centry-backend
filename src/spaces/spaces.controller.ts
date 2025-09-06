import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { AuthenticatedRequest } from 'auth/types/authenticated-request.interface';
import { plainToInstance } from 'class-transformer';
import { formatResponse } from 'common/utils/response.util';
import { CreateSpaceDto } from './dto/create-space.dto';
import { SpaceDto } from './dto/space.dto';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';

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
}
