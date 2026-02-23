import { GetBmstuGroupsUseCase } from './application/use-cases/get-bmstu-groups.use-case';

import { BmstuController } from './interface/http/bmstu.controller';

import { ImportBmstuScheduleService } from './application/services/import-bmstu-schedule.service';

import { Module } from '@nestjs/common';

@Module({
	controllers: [BmstuController],
	providers: [GetBmstuGroupsUseCase, ImportBmstuScheduleService],
	exports: [ImportBmstuScheduleService],
})
export class BmstuModule {}
