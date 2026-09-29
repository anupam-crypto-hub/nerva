import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '@shared/config';
import { DatabaseModule } from '@shared/database';
import { RedisModule } from '@shared/redis';
import { SqsModule } from '@shared/sqs';

// Feature modules
import { AuthModule } from '@modules/auth/auth.module';
import { TenantsModule } from '@modules/tenants/tenants.module';
import { EventsModule } from '@modules/events/events.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { ShipmentsModule } from '@modules/shipments/shipments.module';
import { NdrModule } from '@modules/ndr/ndr.module';
import { WorkflowsModule } from '@modules/workflows/workflows.module';
import { TemplatesModule } from '@modules/templates/templates.module';
import { MessagesModule } from '@modules/messages/messages.module';
import { ConversationsModule } from '@modules/conversations/conversations.module';
import { WebhooksModule } from '@modules/webhooks/webhooks.module';
import { AuditModule } from '@modules/audit/audit.module';
import { CommunicationsModule } from '@modules/communications/communications.module';

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

    // Feature modules
    AuthModule,
    TenantsModule,
    EventsModule,
    CustomersModule,
    OrdersModule,
    ShipmentsModule,
    NdrModule,
    WorkflowsModule,
    TemplatesModule,
    MessagesModule,
    ConversationsModule,
    WebhooksModule,
    AuditModule,
    CommunicationsModule,
  ],
})
export class ApiModule {}
