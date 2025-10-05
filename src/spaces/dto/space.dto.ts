import { Expose } from 'class-transformer';
import type { AccessType } from '../types/access.type';

export class SpaceDto {
	@Expose() id: string;
	@Expose() name: string;
	@Expose() description?: string;

	/** Enriched fields */
	@Expose() hasActiveTgChats: boolean;
	@Expose() access: AccessType;
}
