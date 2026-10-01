import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SellerCallbackService } from './seller-callback.service';
import {
  SellerCallbackProcessor,
  SELLER_CALLBACK_QUEUE,
} from './seller-callback.processor';
import { WebhookLogModule } from '@modules/webhook-log/webhook-log.module';
import { NotificationLogModule } from '@modules/notification-log/notification-log.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: SELLER_CALLBACK_QUEUE }),
    WebhookLogModule,
    NotificationLogModule,
  ],
  providers: [SellerCallbackService, SellerCallbackProcessor],
  exports: [SellerCallbackService],
})
export class SellerCallbackModule {}
