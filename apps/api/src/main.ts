import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { ApiModule } from './api.module';
import { CorrelationIdInterceptor, ResponseInterceptor, GlobalExceptionFilter } from '@shared/common';

async function bootstrap() {
  const logger = new Logger('API');
  const app = await NestFactory.create(ApiModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('apiPort') || 5010;
  const apiVersion = configService.get<string>('apiVersion') || 'v1';

  // Security
  app.use(helmet());
  app.use(compression());
  app.enableCors();

  // Global prefix
  app.setGlobalPrefix(apiVersion);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(),
    new ResponseInterceptor(),
  );

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Notification Module API')
    .setDescription('Multi-Tenant Commerce Engagement & Recovery Platform')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'api-key')
    .addServer(`http://localhost:${port}/${apiVersion}`)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(`🚀 API Server running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
