import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqsConsumer, SqsService, SqsMessagePayload } from '@shared/sqs';
import { PrismaService } from '@shared/database';
import { EventsService } from '@modules/events/events.service';
import { CustomersService } from '@modules/customers/customers.service';
import { OrdersService } from '@modules/orders/orders.service';
import { ShipmentsService } from '@modules/shipments/shipments.service';
import { NdrService } from '@modules/ndr/ndr.service';
import { WorkflowExecutionService } from '@modules/workflows/core/workflow-execution.service';
import type { Message as SQSMessage } from '@aws-sdk/client-sqs';

@Injectable()
export class EventProcessor extends SqsConsumer implements OnModuleInit {
  constructor(
    sqsService: SqsService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly customersService: CustomersService,
    private readonly ordersService: OrdersService,
    private readonly shipmentsService: ShipmentsService,
    private readonly ndrService: NdrService,
    private readonly workflowExecution: WorkflowExecutionService,
  ) {
    super(sqsService, config.get<string>('sqsEventProcessingQueue')!, 'EventProcessor');
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
    const { eventDbId, eventId, eventType, workspaceId } = payload.data;
    const correlationId = payload.metadata.correlationId;

    this.logger.log(`Processing event: ${eventType} (${eventId}) for workspace ${workspaceId}`);

    try {
      // 1. Load the full event
      const event = await this.prisma.event.findUnique({ where: { id: eventDbId } });
      if (!event) {
        this.logger.warn(`Event not found in DB: ${eventDbId}`);
        return;
      }

      // 2. Idempotency: skip if already processed
      if (event.status === 'PROCESSED') {
        this.logger.debug(`Event already processed: ${eventId}`);
        return;
      }

      // Mark as processing
      await this.prisma.event.update({ where: { id: eventDbId }, data: { status: 'PROCESSING' } });

      const eventData = event.data as Record<string, any>;

      // 3. Upsert domain entities based on event type
      await this.updateDomainState(workspaceId, eventType, eventData);

      // 4. Find applicable workflows and create executions
      await this.workflowExecution.processEventForWorkflows(
        {
          id: event.id,
          workspaceId,
          eventId,
          type: eventType,
          data: eventData,
          occurredAt: event.occurredAt,
        },
        correlationId,
      );

      // 5. Mark as processed
      await this.eventsService.markEventProcessed(eventDbId);

      this.logger.log(`✅ Event processed: ${eventType} (${eventId})`);
    } catch (error: any) {
      this.logger.error(`❌ Event processing failed: ${eventType} (${eventId})`, error.stack);
      await this.eventsService.markEventFailed(eventDbId, error);
      throw error; // Let SQS retry
    }
  }

  /**
   * Update domain state (customers, orders, shipments, NDR) based on event data.
   */
  private async updateDomainState(
    workspaceId: string,
    eventType: string,
    data: Record<string, any>,
  ): Promise<void> {
    // Upsert customer if present
    if (data.customer) {
      await this.customersService.upsertFromEvent(workspaceId, {
        external_customer_id: data.customer.id || data.customer.external_customer_id,
        name: data.customer.name,
        phone: data.customer.phone,
        email: data.customer.email,
        language: data.customer.language,
      });
    }

    // Route by event category
    const category = eventType.split('.')[0];

    switch (category) {
      case 'order':
        if (data.order) {
          const customer = data.customer
            ? await this.customersService.upsertFromEvent(workspaceId, {
                external_customer_id: data.customer.id,
                name: data.customer.name,
                phone: data.customer.phone,
                email: data.customer.email,
              })
            : null;

          await this.ordersService.upsertFromEvent(workspaceId, {
            external_order_id: data.order.id || data.order.external_order_id,
            order_number: data.order.order_number,
            customer_id: customer?.id,
            payment_method: data.payment?.method || data.order.payment_method,
            payment_status: data.payment?.status || data.order.payment_status,
            order_status: data.order.status || data.order.order_status,
            currency: data.order.currency,
            subtotal: data.order.subtotal,
            discount: data.order.discount,
            shipping_amount: data.order.shipping_amount,
            total_amount: data.order.total_amount,
            cod_amount: data.order.cod_amount,
            billing_address: data.order.billing_address,
            shipping_address: data.shipping_address || data.order.shipping_address,
            items: data.items || data.order.items,
          });
        }
        break;

      case 'shipment':
        if (data.shipment) {
          await this.shipmentsService.upsertFromEvent(workspaceId, {
            external_shipment_id: data.shipment.id || data.shipment.external_shipment_id,
            order_id: data.shipment.order_id,
            awb: data.shipment.awb,
            courier: data.shipment.courier,
            status: data.shipment.status,
            expected_delivery_date: data.shipment.expected_delivery_date,
            origin: data.shipment.origin,
            destination: data.shipment.destination,
          });
        }
        break;

      case 'ndr':
        if (data.ndr) {
          await this.ndrService.upsertFromEvent(workspaceId, {
            shipment_id: data.ndr.shipment_id,
            order_id: data.ndr.order_id,
            customer_id: data.ndr.customer_id,
            courier_reason: data.ndr.reason || data.ndr.courier_reason,
            attempt_number: data.ndr.attempt_number,
            status: data.ndr.status,
          });
        }
        break;
    }
  }
}
