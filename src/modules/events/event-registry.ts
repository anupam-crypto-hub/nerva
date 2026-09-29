import { Injectable } from '@nestjs/common';

/**
 * Extensible event type registry.
 * All valid event types must be registered here.
 */
@Injectable()
export class EventRegistry {
  private readonly eventTypes = new Map<string, EventTypeConfig>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // Order events
    this.register('order.created', { category: 'ORDER', description: 'New order created' });
    this.register('order.updated', { category: 'ORDER', description: 'Order updated' });
    this.register('order.confirmed', { category: 'ORDER', description: 'Order confirmed by customer' });
    this.register('order.cancelled', { category: 'ORDER', description: 'Order cancelled' });
    this.register('order.payment_success', { category: 'ORDER', description: 'Order payment succeeded' });
    this.register('order.payment_failed', { category: 'ORDER', description: 'Order payment failed' });

    // Checkout events
    this.register('checkout.created', { category: 'CHECKOUT', description: 'Checkout session created' });
    this.register('checkout.updated', { category: 'CHECKOUT', description: 'Checkout updated' });
    this.register('checkout.completed', { category: 'CHECKOUT', description: 'Checkout completed' });
    this.register('checkout.abandoned', { category: 'CHECKOUT', description: 'Checkout abandoned' });

    // Shipment events
    this.register('shipment.created', { category: 'SHIPMENT', description: 'Shipment created' });
    this.register('shipment.updated', { category: 'SHIPMENT', description: 'Shipment updated' });
    this.register('shipment.picked_up', { category: 'SHIPMENT', description: 'Shipment picked up' });
    this.register('shipment.in_transit', { category: 'SHIPMENT', description: 'Shipment in transit' });
    this.register('shipment.out_for_delivery', { category: 'SHIPMENT', description: 'Out for delivery' });
    this.register('shipment.delayed', { category: 'SHIPMENT', description: 'Shipment delayed' });
    this.register('shipment.delivered', { category: 'SHIPMENT', description: 'Shipment delivered' });
    this.register('shipment.failed', { category: 'SHIPMENT', description: 'Delivery failed' });
    this.register('shipment.rto', { category: 'SHIPMENT', description: 'Return to origin' });

    // NDR events
    this.register('ndr.created', { category: 'NDR', description: 'NDR created' });
    this.register('ndr.updated', { category: 'NDR', description: 'NDR updated' });
    this.register('ndr.rescheduled', { category: 'NDR', description: 'NDR rescheduled' });
    this.register('ndr.resolved', { category: 'NDR', description: 'NDR resolved' });
    this.register('ndr.failed', { category: 'NDR', description: 'NDR rescue failed' });

    // Payment events
    this.register('payment.created', { category: 'PAYMENT', description: 'Payment initiated' });
    this.register('payment.success', { category: 'PAYMENT', description: 'Payment succeeded' });
    this.register('payment.failed', { category: 'PAYMENT', description: 'Payment failed' });
    this.register('payment.expired', { category: 'PAYMENT', description: 'Payment expired' });

    // Internal events (emitted by workflows, consumed internally)
    this.register('address.updated', { category: 'ADDRESS', description: 'Address updated' });
    this.register('address.verified', { category: 'ADDRESS', description: 'Address verified' });
  }

  register(type: string, config: EventTypeConfig): void {
    this.eventTypes.set(type, config);
  }

  isValidEventType(type: string): boolean {
    return this.eventTypes.has(type);
  }

  getEventTypes(): string[] {
    return Array.from(this.eventTypes.keys());
  }

  getEventConfig(type: string): EventTypeConfig | undefined {
    return this.eventTypes.get(type);
  }

  getEventsByCategory(category: string): string[] {
    return Array.from(this.eventTypes.entries())
      .filter(([_, config]) => config.category === category)
      .map(([type]) => type);
  }
}

interface EventTypeConfig {
  category: string;
  description: string;
}
