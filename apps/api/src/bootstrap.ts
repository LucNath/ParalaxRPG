import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { json } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ErrorFilter } from './common/error.filter';
import { trustedOrigins } from './common/trusted-origins';

export async function createApplication(logger: false | undefined = undefined, factory: typeof NestFactory = NestFactory) {
  const app = await factory.create(AppModule, { bodyParser: false, logger });
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(json({ limit: '32kb' }));
  app.use(cookieParser());
  app.useGlobalFilters(new ErrorFilter());
  app.enableCors({ origin: trustedOrigins(config), credentials: true });
  app.enableShutdownHooks();
  return app;
}
