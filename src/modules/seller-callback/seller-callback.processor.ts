import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import axios from 'axios';
import { WebhookLogService } from '@modules/webhook-log/webhook-log.service';
import { NotificationLogService } from '@modules/notification-log/notification-log.service';
import { SellerCallbackJobData } from './interfaces/callback-payload.interface';

export const SELLER_CALLBACK_QUEUE = 'seller-callback-queue';

@Processor(SELLER_CALLBACK_QUEUE)
export class SellerCallbackProcessor extends WorkerHost {
  private readonly logger = new Logger(SellerCallbackProcessor.name);

  constructor(
    private readonly webhookLogService: WebhookLogService,
    private readonly notificationLogService: NotificationLogService,
  ) {
    super();
  }

  async process(
    job: Job<SellerCallbackJobData>,
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const { data } = job;
    const startTime = Date.now();
    this.logger.log(
      `Processing seller callback job ${job.id} (attempt ${job.attemptsMade + 1}) for seller=${data.sellerId} to ${data.callbackUrl}`,
    );

    try {
      const response = await axios.post(data.callbackUrl, data.payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Nerva-Webhook/2.0',
          'X-Nerva-Event': data.payload.event,
          'X-Nerva-Seller-Id': data.sellerId,
        },
        timeout: 10000,
      });

      const durationMs = Date.now() - startTime;
      this.logger.log(
        `Seller callback delivered successfully to ${data.callbackUrl} in ${durationMs}ms (status ${response.status})`,
      );

      // Log success in webhook logs
      const webhookLog = await this.webhookLogService.create({
        source: 'seller_callback',
        aggregatorSlug: data.aggregatorSlug,
        headers: { callbackUrl: data.callbackUrl },
        body: {
          payload: data.payload as unknown as Record<string, unknown>,
          statusCode: response.status,
          responseBody: response.data,
          jobId: job.id,
        },
        ip: '127.0.0.1',
      });
      await this.webhookLogService.markProcessed(webhookLog._id.toString(), durationMs);

      // Record callback status on notification log if linked
      if (data.notificationLogId) {
        await this.notificationLogService.updateStatus(
          data.notificationLogId,
          'responded',
          {
            callbackDelivered: true,
            callbackUrl: data.callbackUrl,
            statusCode: response.status,
            deliveredAt: new Date().toISOString(),
          },
        );
      }

      return { success: true, statusCode: response.status };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Seller callback failed for ${data.callbackUrl} (job ${job.id}, attempt ${job.attemptsMade + 1}): ${errorMsg}`,
      );

      // Log failure in webhook logs
      const webhookLog = await this.webhookLogService.create({
        source: 'seller_callback',
        aggregatorSlug: data.aggregatorSlug,
        headers: { callbackUrl: data.callbackUrl },
        body: {
          payload: data.payload as unknown as Record<string, unknown>,
          error: errorMsg,
          jobId: job.id,
          attempt: job.attemptsMade + 1,
        },
        ip: '127.0.0.1',
      });
      await this.webhookLogService.markFailed(webhookLog._id.toString(), errorMsg);

      throw err; // Rethrow to let BullMQ handle retry/backoff
    }
  }
}
