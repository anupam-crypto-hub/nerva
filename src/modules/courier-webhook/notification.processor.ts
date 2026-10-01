import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationRouterService, RouteResult } from '@modules/notification-router/notification-router.service';
import { NotificationLogService } from '@modules/notification-log/notification-log.service';
import { NotificationPayload } from '@modules/notification-router/interfaces/notification-agent.interface';
import { NotificationAgent } from '@modules/seller-settings/schemas/seller-settings.schema';

export interface NotificationJobData {
  sellerId: string;
  aggregatorSlug: string;
  customerPhone: string;
  templateName: string;
  templateParams: Record<string, string>;
  sellerAgents: NotificationAgent[];
  enabledAgentTypes: string[];
  enabledChannels: string[];
  sourceWebhookId: string;
}

export const NOTIFICATION_QUEUE = 'notification-queue';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationRouter: NotificationRouterService,
    private readonly notificationLogService: NotificationLogService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<RouteResult[]> {
    const { data } = job;
    this.logger.log(
      `Processing notification job ${job.id} for seller=${data.sellerId}, phone=${data.customerPhone}`,
    );

    const payload: NotificationPayload = {
      customerPhone: data.customerPhone,
      templateName: data.templateName,
      templateParams: data.templateParams,
    };

    const results = await this.notificationRouter.routeNotification(
      data.sellerAgents,
      payload,
    );

    // Log each notification result
    for (const result of results) {
      await this.notificationLogService.create({
        sellerId: data.sellerId,
        aggregatorSlug: data.aggregatorSlug,
        agentType: result.agentType,
        channel: result.channel,
        customerPhone: data.customerPhone,
        templateName: data.templateName,
        templateParams: data.templateParams,
        requestPayload: payload as unknown as Record<string, unknown>,
        responsePayload: result.result.rawResponse,
        status: result.result.success ? 'sent' : 'failed',
        sourceWebhookId: data.sourceWebhookId,
        msg91RequestId: result.result.requestId,
      });
    }

    return results;
  }
}
