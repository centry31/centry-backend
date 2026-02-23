import type { Request } from 'express';

// TODO: разнести и переместить
/** Интерфейс для декодированной информации из JWT */
interface JwtPayload {
	id: string;
}

/** Кастомный интерфейс для типизации Express Request с `user`. */
export interface AuthenticatedRequest extends Request {
	user?: JwtPayload; // Опциональное поле user с типами JwtPayload
}
