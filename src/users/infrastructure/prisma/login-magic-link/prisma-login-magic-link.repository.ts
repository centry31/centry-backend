import type { LoginMagicLink } from '@users/domain/login-magic-link.entity';

import type { LoginMagicLinkRepository } from '@users/application/ports/login-magic-link/login-magic-link.repository';

import { toDomain, toPersistence } from './mappers';

import type { PrismaService } from 'prisma.service';

export class PrismaLoginMagicLinkRepository implements LoginMagicLinkRepository {
	constructor(private readonly prismaService: PrismaService) {}

	async create(loginMagicLink: LoginMagicLink): Promise<LoginMagicLink> {
		const data = toPersistence(loginMagicLink);
		const record = await this.prismaService.loginMagicLink.create({ data });
		return toDomain(record);
	}

	async findById(id: string): Promise<LoginMagicLink | null> {
		const record = await this.prismaService.loginMagicLink.findUnique({ where: { id } });
		return record ? toDomain(record) : null;
	}

	async findByHashCode(hashCode: string): Promise<LoginMagicLink | null> {
		const record = await this.prismaService.loginMagicLink.findFirst({ where: { hashCode } });
		return record ? toDomain(record) : null;
	}

	async update(loginMagicLink: LoginMagicLink): Promise<void> {
		const data = toPersistence(loginMagicLink);
		await this.prismaService.loginMagicLink.update({ where: { id: loginMagicLink.id }, data });
	}
}
