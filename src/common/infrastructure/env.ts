import { z } from 'zod';

const EnvSchema = z.object({
	PORT: z.coerce.number().default(8080),

	DATABASE_URL: z.string(),
	CLIENT_URL: z.url().default('http://localhost:3000'),

	TG_BOT_TOKEN: z.string(),

	JWT_SECRET_KEY: z.string(),

	REDIS_PORT: z.coerce.number(),
	REDIS_HOST: z.string(),

	BULL_BOARD_USERNAME: z.string().optional(),
	BULL_BOARD_PASSWORD: z.string().optional(),

	TG_BOT_SERVICE_URL: z.string(),
	TG_API_TOKEN: z.string(),

	BMSTU_API_URL: z.string().default('https://lks.bmstu.ru/lks-back/api'),
	BMSTU_SRV_URL: z.string().default('https://lks.bmstu.ru/lks-back/srv'),
	BMSTU_CACHE_TTL_SECONDS: z.coerce.number().default(900),
});

export const ENV = EnvSchema.parse(process.env);
