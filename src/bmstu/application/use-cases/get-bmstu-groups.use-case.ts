import { ENV } from 'common/infrastructure/env';

import { BadGatewayException, Injectable } from '@nestjs/common';
import axios from 'axios';

type BmstuStructureNode = {
	uuid?: string;
	abbr?: string;
	nodeType?: string;
	children?: BmstuStructureNode[];
};

type BmstuStructureResponse = {
	data?: BmstuStructureNode;
};

type BmstuGroup = {
	id: string;
	name: string;
};

@Injectable()
export class GetBmstuGroupsUseCase {
	private readonly cacheTtlMs = ENV.BMSTU_CACHE_TTL_SECONDS * 1000;
	private cache: { data: BmstuGroup[]; expiresAt: number } | null = null;
	private inFlightRefresh: Promise<BmstuGroup[]> | null = null;

	async execute(search?: string): Promise<BmstuGroup[]> {
		if (this.cache && Date.now() < this.cache.expiresAt) {
			return this.filterGroups(this.cache.data, search);
		}

		if (this.inFlightRefresh) {
			return this.inFlightRefresh;
		}

		this.inFlightRefresh = this.refreshCache();
		try {
			const groups = await this.inFlightRefresh;
			return this.filterGroups(groups, search);
		} finally {
			this.inFlightRefresh = null;
		}
	}

	private async fetchStructureRoot(): Promise<BmstuStructureNode> {
		try {
			const response = await axios.get<BmstuStructureResponse>(
				`${ENV.BMSTU_API_URL}/v1/structure`,
				{
					timeout: 20_000,
				},
			);
			if (!response.data?.data) {
				throw new BadGatewayException('Пустой ответ от сервиса структуры МГТУ');
			}
			return response.data.data;
		} catch {
			throw new BadGatewayException('Не удалось получить структуру МГТУ');
		}
	}

	private extractGroups(root: BmstuStructureNode): BmstuGroup[] {
		const stack: BmstuStructureNode[] = [root];
		const groups = new Map<string, string>();

		while (stack.length > 0) {
			const current = stack.pop();
			if (!current) continue;

			if (current.nodeType === 'group' && current.uuid && current.abbr) {
				groups.set(current.uuid, current.abbr);
			}

			if (current.children?.length) {
				stack.push(...current.children);
			}
		}

		return Array.from(groups, ([id, name]) => ({ id, name }));
	}

	private async refreshCache(): Promise<BmstuGroup[]> {
		const root = await this.fetchStructureRoot();
		const parsedGroups = this.extractGroups(root);
		this.cache = {
			data: parsedGroups,
			expiresAt: Date.now() + this.cacheTtlMs,
		};
		return parsedGroups;
	}

	private filterGroups(groups: BmstuGroup[], search?: string): BmstuGroup[] {
		const normalizedSearch = search?.trim().toLocaleLowerCase();
		if (!normalizedSearch) {
			return groups;
		}
		return groups.filter((group) => group.name.toLocaleLowerCase().includes(normalizedSearch));
	}
}
