import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqsService, SqsMessagePayload } from './sqs.service';
import axios from 'axios';

/**
 * QueueService — Abstraction layer over SQS and n8n webhooks.
 *
 * When QUEUE_PROVIDER=sqs  → delegates to SqsService (production)
 * When QUEUE_PROVIDER=n8n  → POSTs payload to n8n webhook URLs (development)
 *
 * This allows temporarily using n8n for workflow orchestration
 * without touching any business logic code.
 *
 * n8n webhook URL mapping:
 *   Queue "notification-module-event-processing"
 *     → POST http://localhost:5678/webhook/event-processing
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly provider: 'sqs' | 'n8n';
  private readonly n8nBaseUrl: string;
  private readonly queuePrefix: string;

  constructor(
    private readonly sqsService: SqsService,
    private readonly config: ConfigService,
  ) {
    this.provider = (this.config.get<string>('queueProvider') || 'sqs') as 'sqs' | 'n8n';
    this.n8nBaseUrl = this.config.get<string>('n8nWebhookBaseUrl') || 'http://localhost:5678/webhook';
    this.queuePrefix = this.config.get<string>('sqsQueuePrefix') || 'notification-module';

    this.logger.log(`✅ QueueService initialized (provider: ${this.provider})`);
  }

  /**
   * Send a message to a queue.
   * Routes to SQS or n8n based on QUEUE_PROVIDER config.
   */
  async sendMessage(
    queueName: string,
    payload: SqsMessagePayload,
    delaySeconds: number = 0,
  ): Promise<string> {
    if (this.provider === 'n8n') {
      return this.sendToN8n(queueName, payload);
    }

    return this.sqsService.sendMessage(queueName, payload, delaySeconds);
  }

  /**
   * POST the message payload to the corresponding n8n webhook URL.
   *
   * Queue name mapping:
   *   "notification-module-event-processing" → /webhook/event-processing
   *   "notification-module-workflow-execution" → /webhook/workflow-execution
   *   etc.
   */
  private async sendToN8n(queueName: string, payload: SqsMessagePayload): Promise<string> {
    // Strip the queue prefix to get the webhook path
    // e.g. "notification-module-event-processing" → "event-processing"
    const webhookPath = queueName.replace(`${this.queuePrefix}-`, '');
    const webhookUrl = `${this.n8nBaseUrl}/${webhookPath}`;

    try {
      const response = await axios.post(webhookUrl, {
        queue: queueName,
        ...payload,
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      this.logger.debug(
        `📤 n8n webhook sent: ${payload.type} → ${webhookUrl} (status: ${response.status})`,
      );

      return `n8n-${Date.now()}`;
    } catch (error: any) {
      // If n8n is unreachable or the workflow doesn't exist, log but don't crash
      if (error.code === 'ECONNREFUSED') {
        this.logger.warn(
          `⚠️ n8n unreachable at ${webhookUrl} — message dropped: ${payload.type}`,
        );
      } else if (error.response?.status === 404) {
        this.logger.warn(
          `⚠️ n8n webhook not found: ${webhookUrl} — create an n8n workflow with Webhook trigger path "/${webhookPath}"`,
        );
      } else {
        this.logger.error(
          `❌ n8n webhook failed: ${webhookUrl} — ${error.message}`,
        );
      }

      // Return a dummy ID — don't fail the API request because n8n is down
      return `n8n-dropped-${Date.now()}`;
    }
  }
}
