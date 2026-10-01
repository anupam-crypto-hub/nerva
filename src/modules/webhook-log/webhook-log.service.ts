import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WebhookLog, WebhookLogDocument } from './schemas/webhook-log.schema';

export interface CreateWebhookLogInput {
  source: 'courier' | 'msg91_outbound' | 'msg91_inbound' | 'seller_callback';
  aggregatorSlug?: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  ip: string;
}

@Injectable()
export class WebhookLogService {
  private readonly logger = new Logger(WebhookLogService.name);

  constructor(
    @InjectModel(WebhookLog.name)
    private readonly webhookLogModel: Model<WebhookLogDocument>,
  ) {}

  async create(input: CreateWebhookLogInput): Promise<WebhookLogDocument> {
    const log = new this.webhookLogModel(input);
    return log.save();
  }

  async markProcessed(
    logId: string,
    durationMs: number,
  ): Promise<void> {
    await this.webhookLogModel
      .findByIdAndUpdate(new Types.ObjectId(logId), {
        $set: { processingStatus: 'processed', processingDurationMs: durationMs },
      })
      .exec();
  }

  async markFailed(logId: string, error: string): Promise<void> {
    await this.webhookLogModel
      .findByIdAndUpdate(new Types.ObjectId(logId), {
        $set: { processingStatus: 'failed', processingError: error },
      })
      .exec();
  }
}
