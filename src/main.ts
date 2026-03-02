// eslint-disable-next-line
import 'dotenv/config';
import { REMINDER_QUEUE_NAME } from 'calendar/infrastructure/queue/reminder-queue.constants';
import { ENV } from 'common/infrastructure/env';

import { AppModule } from './app.module';

import { getQueueToken } from '@nestjs/bullmq';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import * as cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import type { Queue } from 'bullmq';

const BULL_BOARD_BASE_PATH = '/api/admin/queues';
const BULL_BOARD_AUTH_REALM = 'bull-board';

type BasicAuthMiddleware = (req: Request, res: Response, next: NextFunction) => void;

const createBullBoardAuthMiddleware = (
	username?: string,
	password?: string,
): BasicAuthMiddleware | null => {
	if (!username || !password) {
		return null;
	}

	return (req: Request, res: Response, next: NextFunction) => {
		const authHeader = req.headers.authorization ?? '';
		if (!authHeader.startsWith('Basic ')) {
			res.setHeader('WWW-Authenticate', `Basic realm="${BULL_BOARD_AUTH_REALM}"`);
			res.status(401).send('Authentication required');
			return;
		}

		const base64Part = authHeader.slice('Basic '.length);
		const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
		const separatorIndex = decoded.indexOf(':');
		const inputUsername = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : '';
		const inputPassword = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';
		if (inputUsername !== username || inputPassword !== password) {
			res.setHeader('WWW-Authenticate', `Basic realm="${BULL_BOARD_AUTH_REALM}"`);
			res.status(401).send('Unauthorized');
			return;
		}

		next();
	};
};

const setupBullBoard = (app: INestApplication): void => {
	const reminderQueue = app.get<Queue>(getQueueToken(REMINDER_QUEUE_NAME));
	const serverAdapter = new ExpressAdapter();
	serverAdapter.setBasePath(BULL_BOARD_BASE_PATH);

	createBullBoard({
		queues: [new BullMQAdapter(reminderQueue)],
		serverAdapter,
	});

	const authMiddleware = createBullBoardAuthMiddleware(
		ENV.BULL_BOARD_USERNAME,
		ENV.BULL_BOARD_PASSWORD,
	);
	if (authMiddleware) {
		app.use(BULL_BOARD_BASE_PATH, authMiddleware);
	}
	app.use(BULL_BOARD_BASE_PATH, serverAdapter.getRouter());
};

const start = async () => {
	const PORT = ENV.PORT;
	const CLIENT_URL = ENV.CLIENT_URL;
	const app = await NestFactory.create(AppModule);

	app.use(cookieParser());
	app.setGlobalPrefix('api');
	app.enableCors({
		// TODO: remove
		origin: [CLIENT_URL],
		credentials: true,
	});

	// явно ничего не отдаем, кроме Expose()
	// app.useGlobalInterceptors(
	// 	new ClassSerializerInterceptor(app.get(Reflector), { strategy: 'excludeAll' }),
	// );

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true, // Преобразует данные к типу, указанному в DTO
		}),
	);

	setupBullBoard(app);

	await app.listen(PORT, () => console.log('Server is running on PORT ' + PORT));
};

start().finally();
