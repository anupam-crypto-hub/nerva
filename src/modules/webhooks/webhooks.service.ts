import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/database';
import { QueueService } from '@shared/sqs';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly config: ConfigService,
  ) {}

  async create(workspaceId: string, data: { url: string; events: string[] }) {
    const secret = crypto.randomBytes(32).toString('hex');
    return this.prisma.webhook.create({
      data: { workspaceId, url: data.url, events: data.events, secret, status: 'ACTIVE' },
    });
  }

  async list(workspaceId: string) {
    return this.prisma.webhook.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
  }

  async update(workspaceId: string, id: string, data: { url?: string; events?: string[]; status?: string }) {
    return this.prisma.webhook.update({ where: { id }, data });
  }

  async delete(workspaceId: string, id: string) {
    await this.prisma.webhook.delete({ where: { id } });
  }

  async test(workspaceId: string, id: string) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id, workspaceId } });
    if (!webhook) throw new NotFoundException({ errorCode: 'WEBHOOK_NOT_FOUND', message: 'Webhook not found' });

    await this.dispatchWebhookEvent(workspaceId, 'webhook.test', { test: true, timestamp: new Date().toISOString() });
    return { status: 'test_dispatched' };
  }

  /**
   * Dispatch a webhook event to all matching subscriptions.
   */
  async dispatchWebhookEvent(workspaceId: string, event: string, payload: any) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { workspaceId, status: 'ACTIVE', events: { has: event } },
    });

    for (const webhook of webhooks) {
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload,
          status: 'PENDING',
          correlationId: uuidv4(),
        },
      });

      const queueName = this.config.get<string>('sqsWebhookDeliveryQueue')!;
      await this.queueService.sendMessage(queueName, {
        type: 'webhook.deliver',
        data: { deliveryId: delivery.id, webhookId: webhook.id },
        metadata: {
          correlationId: delivery.correlationId || '',
          workspaceId,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
