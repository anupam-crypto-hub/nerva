import { Global, Module } from '@nestjs/common';
import { SqsService } from './sqs.service';
import { QueueService } from './queue.service';

@Global()
@Module({
  providers: [SqsService, QueueService],
  exports: [SqsService, QueueService],
})
export class SqsModule {}
