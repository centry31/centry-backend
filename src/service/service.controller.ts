import { Controller, Get } from '@nestjs/common';
import { formatResponse } from 'common/utils/response.util';

@Controller('service')
export class ServiceController {
	@Get('healthz')
	async healthz() {
		return formatResponse(null, 'ok');
	}
}
