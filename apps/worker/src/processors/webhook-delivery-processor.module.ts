import { Module } from '@nestjs/common';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';
@Module({ providers: [WebhookDeliveryProcessor] })
export class WebhookDeliveryProcessorModule {}
