import { Module } from '@nestjs/common';
import { EventProcessor } from './event.processor';
import { EventsModule } from '@modules/events/events.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { ShipmentsModule } from '@modules/shipments/shipments.module';
import { NdrModule } from '@modules/ndr/ndr.module';
import { WorkflowsModule } from '@modules/workflows/workflows.module';

@Module({
  imports: [EventsModule, CustomersModule, OrdersModule, ShipmentsModule, NdrModule, WorkflowsModule],
  providers: [EventProcessor],
})
export class EventProcessorModule {}
