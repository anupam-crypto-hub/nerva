import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/database';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert an order from event data.
   */
  async upsertFromEvent(
    workspaceId: string,
    data: {
      external_order_id?: string;
      order_number?: string;
      customer_id?: string;
      payment_method?: string;
      payment_status?: string;
      order_status?: string;
      currency?: string;
      subtotal?: number;
      discount?: number;
      shipping_amount?: number;
      total_amount?: number;
      cod_amount?: number;
      billing_address?: any;
      shipping_address?: any;
      items?: any[];
      metadata?: any;
    },
  ) {
    const existing = data.external_order_id
      ? await this.prisma.order.findFirst({
          where: { workspaceId, externalOrderId: data.external_order_id },
        })
      : null;

    if (existing) {
      return this.prisma.order.update({
        where: { id: existing.id },
        data: {
          orderNumber: data.order_number || existing.orderNumber,
          paymentMethod: data.payment_method || existing.paymentMethod,
          paymentStatus: data.payment_status || existing.paymentStatus,
          orderStatus: data.order_status || existing.orderStatus,
          subtotal: data.subtotal ?? existing.subtotal,
          discount: data.discount ?? existing.discount,
          shippingAmount: data.shipping_amount ?? existing.shippingAmount,
          totalAmount: data.total_amount ?? existing.totalAmount,
          codAmount: data.cod_amount ?? existing.codAmount,
          billingAddress: data.billing_address || existing.billingAddress,
          shippingAddress: data.shipping_address || existing.shippingAddress,
          items: data.items || existing.items,
          metadata: data.metadata || existing.metadata,
        },
      });
    }

    return this.prisma.order.create({
      data: {
        workspaceId,
        externalOrderId: data.external_order_id,
        orderNumber: data.order_number,
        customerId: data.customer_id,
        paymentMethod: data.payment_method,
        paymentStatus: data.payment_status,
        orderStatus: data.order_status || 'CREATED',
        currency: data.currency || 'INR',
        subtotal: data.subtotal,
        discount: data.discount || 0,
        shippingAmount: data.shipping_amount || 0,
        totalAmount: data.total_amount,
        codAmount: data.cod_amount,
        billingAddress: data.billing_address,
        shippingAddress: data.shipping_address,
        items: data.items || [],
        metadata: data.metadata,
      },
    });
  }

  async getById(workspaceId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, workspaceId },
      include: { customer: true, shipments: true, ndrs: true },
    });
    if (!order) throw new NotFoundException({ errorCode: 'ORDER_NOT_FOUND', message: 'Order not found' });
    return order;
  }

  async getByExternalId(workspaceId: string, externalOrderId: string) {
    return this.prisma.order.findFirst({
      where: { workspaceId, externalOrderId },
    });
  }

  async updateStatus(workspaceId: string, orderId: string, status: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: status },
    });
  }
}
