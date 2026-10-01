import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request } from 'express';
import { SellerSettingsService } from '@modules/seller-settings/seller-settings.service';
import { WebhookLogService } from '@modules/webhook-log/webhook-log.service';
import { AggregatorConfigDocument } from '@modules/aggregator-config/schemas/aggregator-config.schema';
import { NormalizedCourierPayload } from './interfaces/courier-payload.interface';
import { NOTIFICATION_QUEUE, NotificationJobData } from './notification.processor';
import { normalizePhone } from '@common/utils/phone.util';

@Injectable()
export class CourierWebhookService {
  private readonly logger = new Logger(CourierWebhookService.name);

  constructor(
    private readonly sellerSettingsService: SellerSettingsService,
    private readonly webhookLogService: WebhookLogService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
  ) {}

  async processWebhook(
    aggregatorConfig: AggregatorConfigDocument,
    body: Record<string, unknown>,
    req: Request,
  ): Promise<{ status: string; webhookLogId: string }> {
    const startTime = Date.now();

    // 1. Log raw webhook
    const webhookLog = await this.webhookLogService.create({
      source: 'courier',
      aggregatorSlug: aggregatorConfig.slug,
      headers: req.headers as Record<string, string>,
      body,
      ip: req.ip || '',
    });
    const webhookLogId = webhookLog._id.toString();

    try {
      // 2. Map payload using aggregator's payloadMapping
      const normalized = this.mapPayload(aggregatorConfig, body);

      // 3. Lookup seller settings
      const sellerSettings = await this.sellerSettingsService.findBySellerAndAggregator(
        normalized.sellerId,
        aggregatorConfig.slug,
      );

      if (!sellerSettings) {
        throw new NotFoundException(
          `Seller not configured for notifications: sellerId=${normalized.sellerId}, aggregator=${aggregatorConfig.slug}`,
        );
      }

      // 4. Filter eligible agents (INTERSECT seller agents with aggregator enabled types)
      const eligibleAgents = sellerSettings.notificationAgents.filter(
        (agent) =>
          agent.enabled &&
          aggregatorConfig.enabledAgentTypes.includes(agent.agentType) &&
          aggregatorConfig.enabledChannels.includes(agent.channel),
      );

      if (eligibleAgents.length === 0) {
        this.logger.warn(
          `No eligible agents for seller=${normalized.sellerId}, aggregator=${aggregatorConfig.slug}`,
        );
        await this.webhookLogService.markProcessed(webhookLogId, Date.now() - startTime);
        return { status: 'accepted_no_agents', webhookLogId };
      }

      // 5. Enqueue BullMQ job
      const jobData: NotificationJobData = {
        sellerId: normalized.sellerId,
        aggregatorSlug: aggregatorConfig.slug,
        customerPhone: normalizePhone(normalized.customerPhone),
        templateName: normalized.templateName,
        templateParams: normalized.templateParams,
        sellerAgents: eligibleAgents,
        enabledAgentTypes: aggregatorConfig.enabledAgentTypes,
        enabledChannels: aggregatorConfig.enabledChannels,
        sourceWebhookId: webhookLogId,
      };

      await this.notificationQueue.add('send-notification', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });

      await this.webhookLogService.markProcessed(webhookLogId, Date.now() - startTime);
      this.logger.log(
        `Webhook processed: seller=${normalized.sellerId}, agents=${eligibleAgents.length}, logId=${webhookLogId}`,
      );

      return { status: 'accepted', webhookLogId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.webhookLogService.markFailed(webhookLogId, errorMessage);
      throw error;
    }
  }

  /**
   * Maps raw aggregator payload to normalized format using dot-notation paths.
   * Example: "data.customer.phone" extracts body.data.customer.phone
   */
  private mapPayload(
    aggregatorConfig: AggregatorConfigDocument,
    body: Record<string, unknown>,
  ): NormalizedCourierPayload {
    const mapping = aggregatorConfig.payloadMapping;

    return {
      sellerId: (this.extractValue(body, mapping.sellerId) as string) || '',
      event: (body['event'] as string) || 'order_confirmation',
      customerPhone: (this.extractValue(body, mapping.customerPhone) as string) || '',
      orderNumber: (this.extractValue(body, mapping.orderNumber) as string) || '',
      templateName: (this.extractValue(body, mapping.templateName) as string) || '',
      templateParams: (this.extractValue(body, mapping.templateParams) as Record<string, string>) || {},
      rawPayload: body,
    };
  }

  /**
   * Extracts a value from a nested object using dot-notation path.
   * Example: extractValue({ data: { customer: { phone: "123" } } }, "data.customer.phone") => "123"
   */
  private extractValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}
