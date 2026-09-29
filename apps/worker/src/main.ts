import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.create(WorkerModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('workerPort') || 5011;

  // Worker exposes a minimal health-check HTTP server
  await app.listen(port);
  logger.log(`🔧 Worker Server running on http://localhost:${port}`);
  logger.log('📥 SQS consumers started');
}

bootstrap();
