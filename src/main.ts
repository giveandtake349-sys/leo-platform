import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL', '*');

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: frontendUrl === '*' ? true : [frontendUrl],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    credentials: true,
  });

  app.setGlobalPrefix('v1');

  // Health check — Railway pings this to confirm the app is alive
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/v1/health', (_req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000 ;
  await app.listen(port, "0.0.0.0");
  console.log(`Leo API running on http://localhost:${port}/v1`);
  console.log(`Health check: http://localhost:${port}/v1/health`);
}

bootstrap();
