import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqsConsumer, SqsService, SqsMessagePayload } from '@shared/sqs';
import type { Message as SQSMessage } from '@aws-sdk/client-sqs';

@Injectable()
export class WebhookDeliveryProcessor extends SqsConsumer implements OnModuleInit {
  constructor(sqsService: SqsService, private readonly config: ConfigService) {
    super(sqsService, config.get<string>('sqsWebhookDeliveryQueue')!, 'WebhookDeliveryProcessor');
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
    this.logger.log(`Processing webhook delivery: ${payload.type}`);
    // Phase 8 will implement HMAC-signed delivery with retries
  }
}
