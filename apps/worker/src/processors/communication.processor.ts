import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqsConsumer, SqsService, SqsMessagePayload } from '@shared/sqs';
import type { Message as SQSMessage } from '@aws-sdk/client-sqs';

@Injectable()
export class CommunicationProcessor extends SqsConsumer implements OnModuleInit {
  constructor(sqsService: SqsService, private readonly config: ConfigService) {
    super(sqsService, config.get<string>('sqsCommunicationQueue')!, 'CommunicationProcessor');
  }
  onModuleInit() {
    const provider = this.config.get<string>('queueProvider') || 'sqs';
    if (provider !== 'sqs') {
      this.logger.log(`⏭️ SQS consumer skipped (queue provider: ${provider})`);
      return;
    }
    this.start();
  }

  async processMessage(payload: SqsMessagePayload, _raw: SQSMessage): Promise<void> {
    this.logger.log(`Processing communication: ${payload.type}`);
    // Phase 6 will implement actual message sending
  }
}
