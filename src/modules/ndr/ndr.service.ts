import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/database';

const NDR_REASON_MAP: Record<string, string> = {
  'customer not available': 'CUSTOMER_UNAVAILABLE',
  'customer unavailable': 'CUSTOMER_UNAVAILABLE',
  'not available': 'CUSTOMER_UNAVAILABLE',
  'wrong address': 'WRONG_ADDRESS',
  'incorrect address': 'WRONG_ADDRESS',
  'address incorrect': 'WRONG_ADDRESS',
  'incomplete address': 'INCOMPLETE_ADDRESS',
  'address incomplete': 'INCOMPLETE_ADDRESS',
  'refused': 'CUSTOMER_REFUSED',
  'customer refused': 'CUSTOMER_REFUSED',
  'rejected': 'CUSTOMER_REFUSED',
  'cash not available': 'CASH_UNAVAILABLE',
  'cod not ready': 'CASH_UNAVAILABLE',
  'payment not ready': 'CASH_UNAVAILABLE',
  'phone unreachable': 'PHONE_UNREACHABLE',
  'phone switched off': 'PHONE_UNREACHABLE',
  'office closed': 'OFFICE_CLOSED',
  'area inaccessible': 'AREA_INACCESSIBLE',
  'delivery delayed': 'DELIVERY_DELAYED',
};

@Injectable()
export class NdrService {
  private readonly logger = new Logger(NdrService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert an NDR from event data with automatic reason normalization.
   */
  async upsertFromEvent(
    workspaceId: string,
    data: {
      shipment_id?: string;
      order_id?: string;
      customer_id?: string;
      courier_reason?: string;
      attempt_number?: number;
      status?: string;
      metadata?: any;
    },
  ) {
    // Resolve internal IDs
    let internalShipmentId = data.shipment_id;
    let internalOrderId = data.order_id;
    let internalCustomerId = data.customer_id;

    if (data.shipment_id) {
      const shipment = await this.prisma.shipment.findFirst({
        where: { workspaceId, externalShipmentId: data.shipment_id },
      });
      if (shipment) {
        internalShipmentId = shipment.id;
        internalOrderId = shipment.orderId || internalOrderId;
      }
    }

    const normalizedReason = this.normalizeReason(data.courier_reason);

    return this.prisma.ndr.create({
      data: {
        workspaceId,
        shipmentId: internalShipmentId,
        orderId: internalOrderId,
        customerId: internalCustomerId,
        courierReason: data.courier_reason,
        normalizedReason,
        attemptNumber: data.attempt_number || 1,
        status: data.status || 'CREATED',
        metadata: data.metadata,
      },
    });
  }

  async getById(workspaceId: string, id: string) {
    const ndr = await this.prisma.ndr.findFirst({
      where: { id, workspaceId },
      include: { shipment: true, order: true, customer: true },
    });
    if (!ndr) throw new NotFoundException({ errorCode: 'NDR_NOT_FOUND', message: 'NDR not found' });
    return ndr;
  }

  async updateStatus(id: string, status: string, resolution?: any) {
    const data: any = { status };
    if (status === 'RESOLVED' || status === 'RESCHEDULED') {
      data.resolvedAt = new Date();
    }
    if (resolution) {
      data.resolution = resolution;
    }
    return this.prisma.ndr.update({ where: { id }, data });
  }

  /**
   * Normalize a courier-provided NDR reason to a standard enum value.
   */
  normalizeReason(reason?: string): string {
    if (!reason) return 'OTHER';
    const lower = reason.toLowerCase().trim();

    for (const [key, value] of Object.entries(NDR_REASON_MAP)) {
      if (lower.includes(key)) return value;
    }

    return 'OTHER';
  }
}
