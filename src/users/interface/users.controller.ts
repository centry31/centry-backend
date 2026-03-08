import { CompleteOnboardingUseCase } from 'users/application/use-cases/user/complete-onboarding.use-case';

import { JwtAuthGuard } from './guard/auth/jwt-auth.guard';

import { Controller, Patch, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from 'common/types/authenticated-request.interface';
import { formatResponse } from 'common/utils/response.util';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
	constructor(private readonly completeOnboardingUseCase: CompleteOnboardingUseCase) {}

	@Patch('complete-onboarding')
	async completeOnboarding(@Request() req: AuthenticatedRequest) {
		await this.completeOnboardingUseCase.execute({ userId: req.user.id });
		return formatResponse(null, 'Onboarding пройден');
	}
}
