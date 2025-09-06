import { Request } from 'express';
import { JwtPayload } from './auth.types';

/** Кастомный интерфейс для типизации Express Request с `user`. */
export interface AuthenticatedRequest extends Request {
	user?: JwtPayload; // Опциональное поле user с типами JwtPayload
	currentSpaceId?: string;
}
