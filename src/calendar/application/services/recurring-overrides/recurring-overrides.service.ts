import * as crypto from 'crypto';

import { EventOverride } from 'calendar/domain/event-override.entity';
import { DomainValidationError } from 'common/domain/errors/domain.error';

import type {
	BuildFutureAnchorAfterRemovalCmd,
	RecurringOverrides,
} from 'calendar/application/ports/recurring-overrides/recurring-overrides.port';

import { Injectable } from '@nestjs/common';

const MAX_OVERRIDE_REBASE_STEPS = 10_000;
const REBASE_LIMIT_EXCEEDED_ERROR =
	'Не удалось перестроить серию: слишком длинная цепочка override';

/**
 * Инкапсулирует правила ребейза переопределений для повторяющейся серии.
 *
 * Возвращает новое FUTURE-переопределение, если оно нужно для хвоста,
 * либо `null`, если в хвосте уже есть валидный FUTURE-якорь.
 */
@Injectable()
export class RecurringOverridesService implements RecurringOverrides {
	buildFutureAnchorAfterRemoval(cmd: BuildFutureAnchorAfterRemovalCmd): EventOverride | null {
		const rebaseTargetOrder = this.findRebaseTargetOrder({
			removedOrderIndex: cmd.removedOrderIndex,
			overrides: cmd.overrides,
		});
		if (rebaseTargetOrder === null) {
			return null;
		}

		return new EventOverride({
			id: crypto.randomUUID(),
			eventId: cmd.eventId,
			orderIndex: rebaseTargetOrder,
			offset: cmd.futureShift,
			isDeleted: false,
			isOffsetOnce: false,
		});
	}

	/**
	 * Находит первый индекс серии для вставки нового FUTURE-переопределения.
	 * Возвращает `null`, если следующий FUTURE-якорь уже существует.
	 */
	private findRebaseTargetOrder(params: {
		removedOrderIndex: number;
		overrides: EventOverride[];
	}): number | null {
		const futureOverridesByOrder = new Map<number, EventOverride>();
		for (const override of params.overrides) {
			const isFutureOrder = override.orderIndex > params.removedOrderIndex;
			if (isFutureOrder) {
				futureOverridesByOrder.set(override.orderIndex, override);
			}
		}

		for (
			let step = 0, targetOrder = params.removedOrderIndex + 1;
			step < MAX_OVERRIDE_REBASE_STEPS;
			step += 1, targetOrder += 1
		) {
			const targetOverride = futureOverridesByOrder.get(targetOrder);
			if (!targetOverride) {
				return targetOrder;
			}

			const isSkippableOverride = targetOverride.isDeleted || targetOverride.isOffsetOnce;
			if (isSkippableOverride) {
				continue;
			}

			return null;
		}

		throw new DomainValidationError(REBASE_LIMIT_EXCEEDED_ERROR);
	}
}
