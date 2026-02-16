// eslint-disable-next-line
import 'dotenv/config';
import { ENV } from 'common/infrastructure/env';

import { AppModule } from './app.module';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';

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

	await app.listen(PORT, () => console.log('Server is running on PORT ' + PORT));
};

start().finally();
