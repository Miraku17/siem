import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Builds and configures the Nest application WITHOUT starting a listener.
// Shared by the local server (main.ts → app.listen) and the Vercel serverless
// handler (api/index.ts → app.init), so both behave identically.
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  return app;
}
