import { z } from 'zod';

const EnvSchema = z.object({
	PORT: z.coerce.number().default(8080),

	DATABASE_URL: z.string(),
	CLIENT_URL: z.string().default('http://localhost:3000'),

	TG_BOT_TOKEN: z.string(),

	JWT_SECRET_KEY: z.string(),

	REDIS_PORT: z.coerce.number(),
	REDIS_HOST: z.string(),

	TG_BOT_SERVICE_URL: z.string(),
	TG_API_TOKEN: z.string(),
});

export const ENV = EnvSchema.parse(process.env);
