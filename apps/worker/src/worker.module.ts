import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '@shared/config';
import { DatabaseModule } from '@shared/database';
import { RedisModule } from '@shared/redis';
import { SqsModule } from '@shared/sqs';

// Worker processors
import { EventProcessorModule } from './processors/event-processor.module';
import { WorkflowProcessorModule } from './processors/workflow-processor.module';
import { CommunicationProcessorModule } from './processors/communication-processor.module';
import { ConversationProcessorModule } from './processors/conversation-processor.module';
import { WebhookDeliveryProcessorModule } from './processors/webhook-delivery-processor.module';

// Shared modules needed by processors
import { CustomersModule } from '@modules/customers/customers.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { ShipmentsModule } from '@modules/shipments/shipments.module';
import { NdrModule } from '@modules/ndr/ndr.module';
import { WorkflowsModule } from '@modules/workflows/workflows.module';
import { CommunicationsModule } from '@modules/communications/communications.module';
import { ConversationsModule } from '@modules/conversations/conversations.module';
import { WebhooksModule } from '@modules/webhooks/webhooks.module';
import { AuditModule } from '@modules/audit/audit.module';
import { MessagesModule } from '@modules/messages/messages.module';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'worker', timestamp: new Date().toISOString() };
  }
}

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),

    // Infrastructure
    DatabaseModule,
    RedisModule,
    SqsModule,

    // Domain modules (shared with API)
    CustomersModule,
    OrdersModule,
    ShipmentsModule,
    NdrModule,
    WorkflowsModule,
    CommunicationsModule,
    ConversationsModule,
    WebhooksModule,
    AuditModule,
    MessagesModule,

    // Worker processors
    EventProcessorModule,
    WorkflowProcessorModule,
    CommunicationProcessorModule,
    ConversationProcessorModule,
    WebhookDeliveryProcessorModule,
  ],
  controllers: [HealthController],
})
export class WorkerModule {}
