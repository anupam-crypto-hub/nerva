import { Module } from '@nestjs/common';
import { Msg91Service } from './msg91.service';
import { Msg91InboundService } from './msg91-inbound.service';
import { Msg91WebhookController } from './msg91-webhook.controller';
import { NotificationLogModule } from '@modules/notification-log/notification-log.module';
import { WebhookLogModule } from '@modules/webhook-log/webhook-log.module';
import { SellerSettingsModule } from '@modules/seller-settings/seller-settings.module';
import { SellerCallbackModule } from '@modules/seller-callback/seller-callback.module';

@Module({
  imports: [
    NotificationLogModule,
    WebhookLogModule,
    SellerSettingsModule,
    SellerCallbackModule,
  ],
  controllers: [Msg91WebhookController],
  providers: [Msg91Service, Msg91InboundService],
  exports: [Msg91Service, Msg91InboundService],
})
export class Msg91Module {}
