import { ENV } from 'common/infrastructure/env';

import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import * as ical from 'node-ical';
import { RRule } from 'rrule';

/**
 * Поддерживаемые внешние типы повторений в расписании МГТУ.
 */
type BmstuExternalRecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'DOUBLE_WEEKLY' | 'MONTHLY';

/**
 * Нормализованная внешняя модель повторения события МГТУ.
 */
type BmstuExternalRecurrence = {
	type: BmstuExternalRecurrenceType;
	until?: Date;
};

/**
 * Внешняя модель события расписания МГТУ.
 *
 * Этот тип принадлежит bmstu-модулю и не зависит от calendar-модуля.
 */
type BmstuExternalScheduleEvent = {
	externalId: string;
	title: string;
	description: string | null;
	location: string | null;
	lecturer: string | null;
	start: Date;
	duration: number;
	timeZone: string;
	recurrence: BmstuExternalRecurrence;
};

/**
 * Сервис загрузки и парсинга расписания группы из Bmstu ICS API.
 */
@Injectable()
export class ImportBmstuScheduleService {
	/**
	 * Загружает ICS по `groupId`, парсит и возвращает массив событий.
	 */
	async importGroupSchedule(params: {
		groupId: string;
		timeZone: string;
	}): Promise<BmstuExternalScheduleEvent[]> {
		const groupId = params.groupId.trim();
		if (!groupId) {
			throw new BadRequestException('groupId обязателен');
		}

		const timeZone = params.timeZone.trim();
		this.validateTimeZone(timeZone);

		const icsText = await this.fetchIcsText(groupId);

		const parsed = ical.sync.parseICS(this.normalizeIcsText(icsText));
		const events = Object.values(parsed).filter((entry: any) => entry?.type === 'VEVENT');

		if (events.length === 0) {
			throw new BadRequestException(
				'Bmstu ICS не содержит VEVENT или не удалось распарсить файл',
			);
		}

		return events
			.map((entry: any) => this.mapEvent(entry, timeZone))
			.filter((event): event is BmstuExternalScheduleEvent => Boolean(event));
	}

	private async fetchIcsText(groupId: string): Promise<string> {
		const url = `${ENV.BMSTU_SRV_URL}/v2/ics/${encodeURIComponent(groupId)}`;

		try {
			const response = await axios.get<string>(url, {
				timeout: 15_000,
			});
			return response.data;
		} catch {
			throw new BadRequestException('Не удалось получить ICS с Bmstu API');
		}
	}

	private mapEvent(rawEvent: any, timeZone: string): BmstuExternalScheduleEvent | null {
		const title = String(rawEvent.summary ?? rawEvent.title ?? '').trim();
		if (!title) {
			return null;
		}

		const start = rawEvent.start ? new Date(rawEvent.start) : null;
		const end = rawEvent.end ? new Date(rawEvent.end) : null;
		const hasValidStart = start instanceof Date && !Number.isNaN(start.getTime());
		const hasValidEnd = end instanceof Date && !Number.isNaN(end.getTime());
		if (!hasValidStart || !hasValidEnd) {
			return null;
		}

		const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
		const recurrence = this.mapRecurrence(rawEvent.rrule?.toString());

		return {
			externalId: String(rawEvent.uid ?? ''),
			title,
			description: this.normalizeOptionalString(rawEvent.description),
			location: this.normalizeOptionalString(rawEvent.location),
			lecturer: this.extractLecturer(rawEvent.attendee),
			start,
			duration,
			timeZone,
			recurrence,
		};
	}

	private mapRecurrence(rruleText?: string): BmstuExternalRecurrence {
		if (!rruleText) {
			return { type: 'NONE' };
		}

		const parsed = RRule.parseString(this.extractRRuleBody(rruleText));
		const interval = parsed.interval ?? 1;

		if (parsed.freq === RRule.DAILY && interval === 1) {
			return { type: 'DAILY', until: parsed.until ?? undefined };
		}
		if (parsed.freq === RRule.WEEKLY && interval === 1) {
			return { type: 'WEEKLY', until: parsed.until ?? undefined };
		}
		if (parsed.freq === RRule.WEEKLY && interval === 2) {
			return { type: 'DOUBLE_WEEKLY', until: parsed.until ?? undefined };
		}
		if (parsed.freq === RRule.MONTHLY && interval === 1) {
			return { type: 'MONTHLY', until: parsed.until ?? undefined };
		}

		throw new BadRequestException(`Неподдерживаемый RRULE: ${rruleText}`);
	}

	private extractRRuleBody(rruleText: string): string {
		const normalized = rruleText.trim();
		const lines = normalized.split(/\r?\n/).map((line) => line.trim());
		const rruleLine = lines.find((line) => line.startsWith('RRULE:'));
		const withPrefix =
			rruleLine ?? (normalized.startsWith('RRULE:') ? normalized : `RRULE:${normalized}`);

		return withPrefix.replace(/^RRULE:/, '');
	}

	private extractLecturer(attendee: unknown): string | null {
		if (!attendee) {
			return null;
		}

		const attendees = Array.isArray(attendee) ? attendee : [attendee];
		for (const current of attendees) {
			if (typeof current === 'string') {
				const value = current.trim();
				if (value) {
					return value;
				}
				continue;
			}

			const cn =
				current?.params?.CN ??
				current?.params?.cn ??
				current?.CN ??
				current?.cn ??
				current?.name;
			if (typeof cn === 'string' && cn.trim()) {
				return cn.trim();
			}
		}

		return null;
	}

	private normalizeOptionalString(value: unknown): string | null {
		if (typeof value !== 'string') {
			return null;
		}

		const normalized = value.trim();
		return normalized || null;
	}

	private normalizeIcsText(source: string): string {
		const trimmed = source.trim();
		if (/\r?\n/.test(trimmed)) {
			return trimmed;
		}

		// На случай, если контент пришел одной строкой, добавляем переносы перед
		// основными маркерами iCalendar.
		const markers = [
			'BEGIN:VCALENDAR',
			'VERSION:',
			'CALSCALE:',
			'PRODID:',
			'METHOD:',
			'X-WR-CALNAME:',
			'X-PUBLISHED-TTL:',
			'BEGIN:VEVENT',
			'UID:',
			'SUMMARY:',
			'DTSTAMP:',
			'DTSTART:',
			'DTEND:',
			'DESCRIPTION:',
			'LOCATION:',
			'ATTENDEE;',
			'RRULE:',
			'END:VEVENT',
			'END:VCALENDAR',
		];

		let normalized = trimmed;
		for (const marker of markers) {
			normalized = normalized.replaceAll(` ${marker}`, `\n${marker}`);
		}

		return normalized;
	}

	private validateTimeZone(timeZone: string): void {
		try {
			new Intl.DateTimeFormat('en-US', { timeZone });
		} catch {
			throw new BadRequestException('Некорректная IANA timeZone');
		}
	}
}
