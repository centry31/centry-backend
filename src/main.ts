import { AppModule } from './app.module';

import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';

const start = async () => {
	const PORT = process.env.PORT || 8000;
	const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
	const app = await NestFactory.create(AppModule);

	app.use(cookieParser());
	app.setGlobalPrefix('api');
	app.enableCors({
		// TODO: remove
		origin: [CLIENT_URL, 'https://34a19d1d7016.ngrok-free.app'],
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
