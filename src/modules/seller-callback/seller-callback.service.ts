import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';
import { SELLER_CALLBACK_QUEUE } from './seller-callback.processor';
import { SellerCallbackJobData } from './interfaces/callback-payload.interface';
import { WebhookLogService } from '@modules/webhook-log/webhook-log.service';
import { NotificationLogService } from '@modules/notification-log/notification-log.service';

@Injectable()
export class SellerCallbackService {
  private readonly logger = new Logger(SellerCallbackService.name);

  constructor(
    @InjectQueue(SELLER_CALLBACK_QUEUE)
    private readonly callbackQueue: Queue,
    private readonly webhookLogService: WebhookLogService,
    private readonly notificationLogService: NotificationLogService,
  ) {}

  /**
   * Enqueue seller callback delivery via BullMQ with automatic retries and backoff.
   * If BullMQ enqueue fails (e.g. Redis connection issue), falls back to direct HTTP delivery.
   */
  async sendCallback(jobData: SellerCallbackJobData): Promise<void> {
    try {
      this.logger.log(
        `Enqueuing seller callback for sellerId=${jobData.sellerId} to ${jobData.callbackUrl}`,
      );

      await this.callbackQueue.add('deliver-seller-callback', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
    } catch (queueErr) {
      const err = queueErr as Error;
      this.logger.warn(
        `Failed to enqueue callback to BullMQ: ${err.message}. Falling back to direct HTTP POST delivery.`,
      );
      await this.deliverDirectly(jobData);
    }
  }

  /**
   * Direct HTTP delivery fallback in case queue is unavailable.
   */
  async deliverDirectly(jobData: SellerCallbackJobData): Promise<void> {
    const startTime = Date.now();
    try {
      this.logger.log(`Directly delivering callback to ${jobData.callbackUrl}`);

      const response = await axios.post(jobData.callbackUrl, jobData.payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Nerva-Webhook/2.0',
          'X-Nerva-Event': jobData.payload.event,
          'X-Nerva-Seller-Id': jobData.sellerId,
        },
        timeout: 10000,
      });

      const durationMs = Date.now() - startTime;
      this.logger.log(
        `Direct callback delivered to ${jobData.callbackUrl} in ${durationMs}ms (status ${response.status})`,
      );

      const webhookLog = await this.webhookLogService.create({
        source: 'seller_callback',
        aggregatorSlug: jobData.aggregatorSlug,
        headers: { callbackUrl: jobData.callbackUrl },
        body: {
          payload: jobData.payload as unknown as Record<string, unknown>,
          statusCode: response.status,
          responseBody: response.data,
          direct: true,
        },
        ip: '127.0.0.1',
      });
      await this.webhookLogService.markProcessed(webhookLog._id.toString(), durationMs);

      if (jobData.notificationLogId) {
        await this.notificationLogService.updateStatus(
          jobData.notificationLogId,
          'responded',
          {
            callbackDelivered: true,
            callbackUrl: jobData.callbackUrl,
            statusCode: response.status,
            deliveredAt: new Date().toISOString(),
            direct: true,
          },
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Direct callback delivery failed for ${jobData.callbackUrl}: ${errorMsg}`,
      );

      const webhookLog = await this.webhookLogService.create({
        source: 'seller_callback',
        aggregatorSlug: jobData.aggregatorSlug,
        headers: { callbackUrl: jobData.callbackUrl },
        body: {
          payload: jobData.payload as unknown as Record<string, unknown>,
          error: errorMsg,
          direct: true,
        },
        ip: '127.0.0.1',
      });
      await this.webhookLogService.markFailed(webhookLog._id.toString(), errorMsg);
    }
  }
}
