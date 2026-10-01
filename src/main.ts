import * as dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Fallback to default DNS
}

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { AppValidationPipe } from '@common/pipes/validation.pipe';
import { AppConfig } from '@config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app');

  // Security & compression
  app.use(helmet());
  const compress = typeof compression === 'function' ? compression : (compression as any)?.default;
  if (compress) {
    app.use(compress());
  }

  // Global prefix
  const prefix = appConfig?.apiPrefix || 'v1';
  app.setGlobalPrefix(prefix, {
    exclude: ['health', 'docs'],
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(AppValidationPipe);
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS
  app.enableCors();

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nerva v2')
    .setDescription('Notification Bridge — Courier Aggregators to Notification Agents')
    .setVersion('2.0.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Start
  const port = appConfig?.port || 5010;
  await app.listen(port);
  logger.log(`Nerva v2 running on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
