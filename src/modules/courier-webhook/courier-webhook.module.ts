import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CourierWebhookController } from './courier-webhook.controller';
import { CourierWebhookService } from './courier-webhook.service';
import { NotificationProcessor, NOTIFICATION_QUEUE } from './notification.processor';
import { SellerSettingsModule } from '@modules/seller-settings/seller-settings.module';
import { WebhookLogModule } from '@modules/webhook-log/webhook-log.module';
import { NotificationRouterModule } from '@modules/notification-router/notification-router.module';
import { NotificationLogModule } from '@modules/notification-log/notification-log.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    SellerSettingsModule,
    WebhookLogModule,
    NotificationRouterModule,
    NotificationLogModule,
    AuthModule,
  ],
  controllers: [CourierWebhookController],
  providers: [CourierWebhookService, NotificationProcessor],
})
export class CourierWebhookModule {}
