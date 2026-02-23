import { ENV } from 'common/infrastructure/env';

import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';

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

type BmstuGroupScheduleResponse = {
	data?: {
		uuid?: string;
		title?: string;
		schedule?: BmstuGroupScheduleEntry[];
	};
};

type BmstuCurrentScheduleResponse = {
	data?: {
		semesterStarts?: string;
		semesterEnds?: string;
		weekNumber?: number;
		weekName?: string;
		weekShortName?: string;
	};
};

type BmstuGroupScheduleEntry = {
	day?: number;
	time?: number;
	week?: string;
	startTime?: string;
	endTime?: string;
	discipline?: {
		fullName?: string;
		shortName?: string | null;
		abbr?: string;
		actType?: string;
	};
	teachers?: Array<{
		lastName?: string;
		firstName?: string;
		middleName?: string;
	}>;
	audiences?: Array<{
		building?: string;
		name?: string;
	}>;
	groups?: Array<{
		uuid?: string;
	}>;
};

type WeekTag = 'all' | 'ch' | 'zn';

type WeekParityMap = {
	ch: 0 | 1;
	zn: 0 | 1;
};

type LocalDate = {
	year: number;
	month: number;
	day: number;
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
 * Сервис загрузки и преобразования расписания группы из публичных JSON-ручек Bmstu.
 */
@Injectable()
export class ImportBmstuScheduleService {
	private readonly formatterByTimeZone = new Map<string, Intl.DateTimeFormat>();

	/**
	 * Загружает расписание по `groupId` и возвращает нормализованный массив событий.
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

		const [groupSchedule, currentSchedule] = await Promise.all([
			this.fetchGroupSchedule(groupId),
			this.fetchCurrentSchedule(),
		]);

		const entries = groupSchedule.data?.schedule ?? [];
		if (!Array.isArray(entries) || entries.length === 0) {
			throw new BadRequestException('Bmstu не вернул элементов расписания');
		}

		const semester = this.parseSemesterRange(currentSchedule);
		const weekParityMap = this.resolveWeekParityMap(currentSchedule);

		const mappedEvents = entries
			.map((entry) =>
				this.mapScheduleEntry({
					entry,
					groupId,
					timeZone,
					semester,
					weekParityMap,
				}),
			)
			.filter((event): event is BmstuExternalScheduleEvent => Boolean(event));

		if (mappedEvents.length === 0) {
			throw new BadRequestException('Bmstu вернул расписание, но не удалось собрать события');
		}

		return mappedEvents;
	}

	private async fetchGroupSchedule(groupId: string): Promise<BmstuGroupScheduleResponse> {
		const url = `${ENV.BMSTU_API_URL}/v1/schedules/groups/${encodeURIComponent(
			groupId,
		)}/public`;
		try {
			const response = await axios.get<BmstuGroupScheduleResponse>(url, {
				timeout: 15_000,
			});
			if (!response.data?.data) {
				throw new BadRequestException('Пустой ответ от Bmstu расписания группы');
			}
			return response.data;
		} catch {
			throw new BadRequestException('Не удалось получить расписание группы Bmstu');
		}
	}

	private async fetchCurrentSchedule(): Promise<BmstuCurrentScheduleResponse> {
		const url = `${ENV.BMSTU_API_URL}/v1/schedules/current`;
		try {
			const response = await axios.get<BmstuCurrentScheduleResponse>(url, {
				timeout: 15_000,
			});
			if (!response.data?.data) {
				throw new BadRequestException('Пустой ответ от Bmstu current schedule');
			}
			return response.data;
		} catch {
			throw new BadRequestException('Не удалось получить данные текущего семестра Bmstu');
		}
	}

	private mapScheduleEntry(params: {
		entry: BmstuGroupScheduleEntry;
		groupId: string;
		timeZone: string;
		semester: {
			start: LocalDate;
			end: LocalDate;
		};
		weekParityMap: WeekParityMap;
	}): BmstuExternalScheduleEvent | null {
		const { entry, groupId, timeZone, semester, weekParityMap } = params;
		if (!this.belongsToGroup(entry, groupId)) {
			return null;
		}

		const title = this.resolveTitle(entry);
		if (!title) {
			return null;
		}

		const week = this.normalizeWeekTag(entry.week);
		if (!week) {
			return null;
		}

		const startMinutes = this.parseClockToMinutes(entry.startTime);
		const endMinutes = this.parseClockToMinutes(entry.endTime);
		if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
			return null;
		}

		const duration = endMinutes - startMinutes;
		const targetIsoDay = Number(entry.day);
		if (!Number.isInteger(targetIsoDay) || targetIsoDay < 1 || targetIsoDay > 7) {
			return null;
		}

		const firstOccurrenceDate = this.resolveFirstOccurrenceDate({
			semesterStart: semester.start,
			targetIsoDay,
			week,
			weekParityMap,
		});
		const start = this.buildDateFromLocal({
			localDate: firstOccurrenceDate,
			timeZone,
			minutes: startMinutes,
		});
		const until = this.buildDateFromLocal({
			localDate: semester.end,
			timeZone,
			minutes: 23 * 60 + 59,
			seconds: 59,
		});

		const recurrence = this.buildRecurrence(week, until);
		const sourceDescription = this.resolveActTypeLabel(entry.discipline?.actType);
		const location = this.resolveLocation(entry.audiences);
		const lecturer = this.resolveLecturer(entry.teachers);
		const description = this.buildImportedDescription({
			sourceDescription,
			location,
			lecturer,
		});

		return {
			externalId: this.buildExternalId(groupId, entry, title),
			title,
			description,
			location,
			lecturer,
			start,
			duration,
			timeZone,
			recurrence,
		};
	}

	private buildRecurrence(week: WeekTag, until: Date): BmstuExternalRecurrence {
		if (week === 'all') {
			return {
				type: 'WEEKLY',
				until,
			};
		}

		return {
			type: 'DOUBLE_WEEKLY',
			until,
		};
	}

	private buildExternalId(
		groupId: string,
		entry: BmstuGroupScheduleEntry,
		title: string,
	): string {
		const week = this.normalizeWeekTag(entry.week) ?? 'all';
		return [
			groupId,
			String(entry.day ?? ''),
			String(entry.time ?? ''),
			week,
			title,
			String(entry.discipline?.actType ?? ''),
		].join(':');
	}

	private buildImportedDescription(params: {
		sourceDescription: string | null;
		location: string | null;
		lecturer: string | null;
	}): string | null {
		const lines: string[] = [];
		if (params.sourceDescription) {
			lines.push(params.sourceDescription);
		}
		if (params.location) {
			lines.push(`Аудитория: ${params.location}`);
		}
		if (params.lecturer) {
			lines.push(`Преподаватель: ${params.lecturer}`);
		}

		return lines.length > 0 ? lines.join('\n') : null;
	}

	private resolveTitle(entry: BmstuGroupScheduleEntry): string | null {
		const title =
			entry.discipline?.fullName ??
			entry.discipline?.shortName ??
			entry.discipline?.abbr ??
			'';
		const normalized = title.trim();
		return normalized || null;
	}

	private resolveActTypeLabel(actType?: string): string | null {
		if (!actType) {
			return null;
		}

		switch (actType.trim().toLowerCase()) {
			case 'lecture':
				return 'Лекция';
			case 'seminar':
				return 'Семинар';
			case 'lab':
				return 'Лабораторная работа';
			case 'generated':
				return 'Самостоятельная работа';
			default:
				return null;
		}
	}

	private resolveLecturer(
		teachers?: Array<{
			lastName?: string;
			firstName?: string;
			middleName?: string;
		}>,
	): string | null {
		if (!Array.isArray(teachers) || teachers.length === 0) {
			return null;
		}

		const names = teachers
			.map((teacher) =>
				[teacher.lastName, teacher.firstName, teacher.middleName]
					.filter((part) => typeof part === 'string' && part.trim().length > 0)
					.join(' ')
					.trim(),
			)
			.filter((name) => name.length > 0);

		return names.length > 0 ? names.join(', ') : null;
	}

	private resolveLocation(
		audiences?: Array<{
			building?: string;
			name?: string;
		}>,
	): string | null {
		if (!Array.isArray(audiences) || audiences.length === 0) {
			return null;
		}

		const normalized = audiences
			.map((audience) => {
				const building = this.normalizeOptionalString(audience.building);
				const name = this.normalizeOptionalString(audience.name);
				if (building && name) {
					return `${building}, ${name}`;
				}
				return building ?? name ?? null;
			})
			.filter((value): value is string => Boolean(value));

		return normalized.length > 0 ? normalized.join('; ') : null;
	}

	private belongsToGroup(entry: BmstuGroupScheduleEntry, groupId: string): boolean {
		if (!Array.isArray(entry.groups) || entry.groups.length === 0) {
			return true;
		}

		return entry.groups.some((group) => group?.uuid === groupId);
	}

	private normalizeWeekTag(week?: string): WeekTag | null {
		const value = String(week ?? '')
			.trim()
			.toLowerCase();
		if (value === 'all' || value === 'ch' || value === 'zn') {
			return value;
		}
		return null;
	}

	private parseClockToMinutes(value?: string): number | null {
		if (!value) {
			return null;
		}

		const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
		if (!match) {
			return null;
		}

		const hours = Number(match[1]);
		const minutes = Number(match[2]);
		const isValid = hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
		if (!isValid) {
			return null;
		}

		return hours * 60 + minutes;
	}

	private parseSemesterRange(response: BmstuCurrentScheduleResponse): {
		start: LocalDate;
		end: LocalDate;
	} {
		const startRaw = this.normalizeOptionalString(response.data?.semesterStarts);
		const endRaw = this.normalizeOptionalString(response.data?.semesterEnds);
		if (!startRaw || !endRaw) {
			throw new BadRequestException('Bmstu current schedule не содержит границы семестра');
		}

		return {
			start: this.parseIsoDate(startRaw),
			end: this.parseIsoDate(endRaw),
		};
	}

	private parseIsoDate(value: string): LocalDate {
		const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) {
			throw new BadRequestException(`Некорректная дата семестра: ${value}`);
		}

		const year = Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		const isValid = month >= 1 && month <= 12 && day >= 1 && day <= 31;
		if (!isValid) {
			throw new BadRequestException(`Некорректная дата семестра: ${value}`);
		}

		return { year, month, day };
	}

	private resolveWeekParityMap(response: BmstuCurrentScheduleResponse): WeekParityMap {
		const weekNumber = Number(response.data?.weekNumber);
		const parity: 0 | 1 = Number.isInteger(weekNumber) && weekNumber % 2 === 0 ? 0 : 1;

		const weekLabels = [
			this.normalizeWeekLabel(response.data?.weekShortName),
			this.normalizeWeekLabel(response.data?.weekName),
		];
		if (weekLabels.includes('ch')) {
			return {
				ch: parity,
				zn: parity === 1 ? 0 : 1,
			};
		}
		if (weekLabels.includes('zn')) {
			return {
				ch: parity === 1 ? 0 : 1,
				zn: parity,
			};
		}

		// Дефолт на случай отсутствия weekName/weekShortName:
		// первая неделя семестра -> "чс".
		return {
			ch: 1,
			zn: 0,
		};
	}

	private normalizeWeekLabel(value?: string): 'ch' | 'zn' | null {
		if (!value) {
			return null;
		}

		const normalized = value.trim().toLowerCase().replaceAll('.', '').replaceAll(' ', '');
		if (normalized === 'чс' || normalized === 'числитель' || normalized === 'ch') {
			return 'ch';
		}
		if (normalized === 'зн' || normalized === 'знаменатель' || normalized === 'zn') {
			return 'zn';
		}
		return null;
	}

	private resolveFirstOccurrenceDate(params: {
		semesterStart: LocalDate;
		targetIsoDay: number;
		week: WeekTag;
		weekParityMap: WeekParityMap;
	}): LocalDate {
		const { semesterStart, targetIsoDay, week, weekParityMap } = params;
		const semesterStartIsoDay = this.getIsoWeekday(semesterStart);
		const deltaDays = (targetIsoDay - semesterStartIsoDay + 7) % 7;
		let firstOccurrence = this.addDays(semesterStart, deltaDays);

		if (week === 'all') {
			return firstOccurrence;
		}

		const requiredParity = week === 'ch' ? weekParityMap.ch : weekParityMap.zn;
		const semesterWeekIndex = Math.floor(this.diffDays(semesterStart, firstOccurrence) / 7) + 1;
		const weekParity = (semesterWeekIndex % 2) as 0 | 1;
		if (weekParity !== requiredParity) {
			firstOccurrence = this.addDays(firstOccurrence, 7);
		}

		return firstOccurrence;
	}

	private buildDateFromLocal(params: {
		localDate: LocalDate;
		timeZone: string;
		minutes: number;
		seconds?: number;
	}): Date {
		const { localDate, timeZone, minutes, seconds = 0 } = params;
		const hour = Math.floor(minutes / 60);
		const minute = minutes % 60;

		const target = {
			year: localDate.year,
			month: localDate.month,
			day: localDate.day,
			hour,
			minute,
			second: seconds,
		};

		let timestamp = Date.UTC(
			target.year,
			target.month - 1,
			target.day,
			hour,
			minute,
			seconds,
			0,
		);
		for (let attempt = 0; attempt < 4; attempt += 1) {
			const actual = this.getZonedDateTimeParts(new Date(timestamp), timeZone);
			const deltaSeconds =
				this.localDateTimeToSeconds(target) - this.localDateTimeToSeconds(actual);
			if (deltaSeconds === 0) {
				return new Date(timestamp);
			}
			timestamp += deltaSeconds * 1000;
		}

		const resolved = new Date(timestamp);
		const resolvedParts = this.getZonedDateTimeParts(resolved, timeZone);
		const isResolved =
			resolvedParts.year === target.year &&
			resolvedParts.month === target.month &&
			resolvedParts.day === target.day &&
			resolvedParts.hour === target.hour &&
			resolvedParts.minute === target.minute &&
			resolvedParts.second === target.second;
		if (!isResolved) {
			throw new BadRequestException(
				'Не удалось собрать локальное время события в указанной timeZone',
			);
		}

		return resolved;
	}

	private normalizeOptionalString(value: unknown): string | null {
		if (typeof value !== 'string') {
			return null;
		}

		const normalized = value.trim();
		return normalized || null;
	}

	private localDateTimeToSeconds(value: {
		year: number;
		month: number;
		day: number;
		hour: number;
		minute: number;
		second: number;
	}): number {
		return Math.floor(
			Date.UTC(
				value.year,
				value.month - 1,
				value.day,
				value.hour,
				value.minute,
				value.second,
				0,
			) / 1000,
		);
	}

	private getZonedDateTimeParts(
		date: Date,
		timeZone: string,
	): {
		year: number;
		month: number;
		day: number;
		hour: number;
		minute: number;
		second: number;
	} {
		const formatter = this.getFormatter(timeZone);
		const map = Object.fromEntries(
			formatter
				.formatToParts(date)
				.filter((part) => part.type !== 'literal')
				.map((part) => [part.type, part.value]),
		);
		return {
			year: Number(map.year),
			month: Number(map.month),
			day: Number(map.day),
			hour: Number(map.hour),
			minute: Number(map.minute),
			second: Number(map.second),
		};
	}

	private getFormatter(timeZone: string): Intl.DateTimeFormat {
		const cached = this.formatterByTimeZone.get(timeZone);
		if (cached) {
			return cached;
		}

		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23',
		});
		this.formatterByTimeZone.set(timeZone, formatter);
		return formatter;
	}

	private getIsoWeekday(date: LocalDate): number {
		const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
		return weekday === 0 ? 7 : weekday;
	}

	private addDays(date: LocalDate, days: number): LocalDate {
		const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
		return {
			year: shifted.getUTCFullYear(),
			month: shifted.getUTCMonth() + 1,
			day: shifted.getUTCDate(),
		};
	}

	private diffDays(start: LocalDate, end: LocalDate): number {
		const startTimestamp = Date.UTC(start.year, start.month - 1, start.day);
		const endTimestamp = Date.UTC(end.year, end.month - 1, end.day);
		return Math.floor((endTimestamp - startTimestamp) / 86_400_000);
	}

	private validateTimeZone(timeZone: string): void {
		try {
			new Intl.DateTimeFormat('en-US', { timeZone });
		} catch {
			throw new BadRequestException('Некорректная IANA timeZone');
		}
	}
}
