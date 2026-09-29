import { Module } from '@nestjs/common';
import { CommunicationService, WhatsAppProvider } from './communication.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { SqsModule } from '@shared/sqs';

@Module({
  imports: [SqsModule],
  controllers: [WhatsAppWebhookController],
  providers: [CommunicationService, WhatsAppProvider],
  exports: [CommunicationService, WhatsAppProvider],
})
export class CommunicationsModule {}
