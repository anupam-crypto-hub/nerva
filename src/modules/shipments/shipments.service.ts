import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/database';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertFromEvent(
    workspaceId: string,
    data: {
      external_shipment_id?: string;
      order_id?: string;
      awb?: string;
      courier?: string;
      status?: string;
      expected_delivery_date?: string;
      origin?: any;
      destination?: any;
      metadata?: any;
    },
  ) {
    // Resolve internal order ID from external
    let internalOrderId = data.order_id;
    if (data.order_id) {
      const order = await this.prisma.order.findFirst({
        where: { workspaceId, externalOrderId: data.order_id },
      });
      if (order) internalOrderId = order.id;
    }

    const existing = data.external_shipment_id
      ? await this.prisma.shipment.findFirst({
          where: { workspaceId, externalShipmentId: data.external_shipment_id },
        })
      : data.awb
        ? await this.prisma.shipment.findFirst({
            where: { workspaceId, awb: data.awb },
          })
        : null;

    if (existing) {
      const updated = await this.prisma.shipment.update({
        where: { id: existing.id },
        data: {
          awb: data.awb || existing.awb,
          courier: data.courier || existing.courier,
          status: data.status || existing.status,
          expectedDeliveryDate: data.expected_delivery_date
            ? new Date(data.expected_delivery_date)
            : existing.expectedDeliveryDate,
          origin: data.origin || existing.origin,
          destination: data.destination || existing.destination,
          metadata: data.metadata || existing.metadata,
        },
      });

      // Add status history event
      if (data.status && data.status !== existing.status) {
        await this.prisma.shipmentEvent.create({
          data: {
            shipmentId: existing.id,
            status: data.status,
            occurredAt: new Date(),
          },
        });
      }

      return updated;
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        workspaceId,
        externalShipmentId: data.external_shipment_id,
        orderId: internalOrderId,
        awb: data.awb,
        courier: data.courier,
        status: data.status || 'CREATED',
        expectedDeliveryDate: data.expected_delivery_date
          ? new Date(data.expected_delivery_date)
          : undefined,
        origin: data.origin,
        destination: data.destination,
        metadata: data.metadata,
      },
    });

    // Create initial status event
    await this.prisma.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        status: data.status || 'CREATED',
        occurredAt: new Date(),
      },
    });

    return shipment;
  }

  async getById(workspaceId: string, id: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, workspaceId },
      include: { shipmentEvents: { orderBy: { occurredAt: 'desc' } }, order: true },
    });
    if (!shipment) throw new NotFoundException({ errorCode: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found' });
    return shipment;
  }

  async getByAwb(workspaceId: string, awb: string) {
    return this.prisma.shipment.findFirst({
      where: { workspaceId, awb },
      include: { shipmentEvents: { orderBy: { occurredAt: 'desc' } } },
    });
  }
}
