import type { EventOverride } from 'calendar/domain/event-override.entity';

export type BuildFutureAnchorAfterRemovalCmd = {
	eventId: string;
	removedOrderIndex: number;
	futureShift: number;
	overrides: EventOverride[];
};

export interface RecurringOverrides {
	buildFutureAnchorAfterRemoval(cmd: BuildFutureAnchorAfterRemovalCmd): EventOverride | null;
}

export const RECURRING_OVERRIDES = Symbol('RECURRING_OVERRIDES');
