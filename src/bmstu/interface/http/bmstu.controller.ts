import { GetBmstuGroupsUseCase } from 'bmstu/application/use-cases/get-bmstu-groups.use-case';

import { BmstuGroupsQueryDto } from './dto/bmstu-groups-query.dto';

import { Controller, Get, Query } from '@nestjs/common';
import { formatResponse } from 'common/utils/response.util';

@Controller('bmstu')
export class BmstuController {
	constructor(private readonly getBmstuGroupsUseCase: GetBmstuGroupsUseCase) {}

	@Get('groups')
	async getGroups(@Query() query: BmstuGroupsQueryDto) {
		const groups = await this.getBmstuGroupsUseCase.execute(query.search);
		return formatResponse(groups, 'Группы МГТУ получены');
	}
}
