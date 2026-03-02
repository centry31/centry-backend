import { ServiceController } from './service.controller';

import { Module } from '@nestjs/common';

@Module({
	controllers: [ServiceController],
})
export class ServiceModule {}
