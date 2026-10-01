import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NotificationLog,
  NotificationLogDocument,
} from './schemas/notification-log.schema';
import { normalizePhone } from '@common/utils/phone.util';

export interface CreateNotificationLogInput {
  sellerId: string;
  aggregatorSlug: string;
  agentType: string;
  channel: string;
  customerPhone: string;
  templateName: string;
  templateParams: Record<string, string>;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  status: string;
  sourceWebhookId?: string;
  msg91RequestId?: string;
}

@Injectable()
export class NotificationLogService {
  private readonly logger = new Logger(NotificationLogService.name);

  constructor(
    @InjectModel(NotificationLog.name)
    private readonly notificationLogModel: Model<NotificationLogDocument>,
  ) {}

  async create(input: CreateNotificationLogInput): Promise<NotificationLogDocument> {
    const log = new this.notificationLogModel({
      ...input,
      statusHistory: [{ status: input.status, timestamp: new Date() }],
    });
    return log.save();
  }

  async updateStatus(
    logId: string,
    status: string,
    rawPayload?: Record<string, unknown>,
    msg91Fields?: { crqid?: string; uuid?: string; requestId?: string },
  ): Promise<NotificationLogDocument | null> {
    return this.notificationLogModel
      .findByIdAndUpdate(
        new Types.ObjectId(logId),
        {
          $set: {
            status,
            ...(msg91Fields?.crqid && { msg91Crqid: msg91Fields.crqid }),
            ...(msg91Fields?.uuid && { msg91Uuid: msg91Fields.uuid }),
            ...(msg91Fields?.requestId && { msg91RequestId: msg91Fields.requestId }),
          },
          $push: {
            statusHistory: { status, timestamp: new Date(), raw: rawPayload },
          },
        },
        { new: true },
      )
      .exec();
  }

  async updateStatusByMsg91RequestId(
    requestId: string,
    status: string,
    rawPayload?: Record<string, unknown>,
    msg91Fields?: { crqid?: string; uuid?: string },
  ): Promise<NotificationLogDocument | null> {
    return this.notificationLogModel
      .findOneAndUpdate(
        { msg91RequestId: requestId },
        {
          $set: {
            status,
            ...(msg91Fields?.crqid && { msg91Crqid: msg91Fields.crqid }),
            ...(msg91Fields?.uuid && { msg91Uuid: msg91Fields.uuid }),
          },
          $push: {
            statusHistory: { status, timestamp: new Date(), raw: rawPayload },
          },
        },
        { new: true },
      )
      .exec();
  }

  async findById(id: string): Promise<NotificationLogDocument | null> {
    return this.notificationLogModel.findById(new Types.ObjectId(id)).exec();
  }

  async findBySellerId(
    sellerId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: NotificationLogDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.notificationLogModel
        .find({ sellerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationLogModel.countDocuments({ sellerId }).exec(),
    ]);
    return { data, total };
  }

  async getStats(): Promise<Record<string, number>> {
    const results = await this.notificationLogModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const stats: Record<string, number> = {};
    for (const result of results) {
      stats[result._id as string] = result.count as number;
    }
    return stats;
  }

  /**
   * Find the most recent notification log by phone and optionally template name.
   * Also checks MSG91 identifiers (requestId / crqid) for exact correlation.
   */
  async findByPhoneAndTemplate(
    customerPhone: string,
    templateName?: string,
    msg91Identifiers?: { requestId?: string; crqid?: string },
  ): Promise<NotificationLogDocument | null> {
    // 1. If requestId provided, attempt exact match
    if (msg91Identifiers?.requestId) {
      const match = await this.notificationLogModel
        .findOne({ msg91RequestId: msg91Identifiers.requestId })
        .exec();
      if (match) return match;
    }

    // 2. If crqid provided, attempt exact match
    if (msg91Identifiers?.crqid) {
      const match = await this.notificationLogModel
        .findOne({ msg91Crqid: msg91Identifiers.crqid })
        .exec();
      if (match) return match;
    }

    const normalized = customerPhone ? normalizePhone(customerPhone) : '';

    // 3. Match by normalized phone + templateName (latest first)
    if (normalized && templateName) {
      const match = await this.notificationLogModel
        .findOne({ customerPhone: normalized, templateName })
        .sort({ createdAt: -1 })
        .exec();
      if (match) return match;
    }

    // 4. Fallback: match by normalized phone alone (latest first)
    if (normalized) {
      return this.notificationLogModel
        .findOne({ customerPhone: normalized })
        .sort({ createdAt: -1 })
        .exec();
    }

    return null;
  }

  /**
   * Record customer inbound response (button click) on the notification log.
   */
  async recordInboundResponse(
    logId: string,
    action: string,
    buttonText: string,
    rawPayload: Record<string, unknown>,
  ): Promise<NotificationLogDocument | null> {
    return this.notificationLogModel
      .findByIdAndUpdate(
        new Types.ObjectId(logId),
        {
          $set: {
            status: 'responded',
            customerResponseAction: action,
          },
          $push: {
            statusHistory: {
              status: `responded_${action.toLowerCase()}`,
              timestamp: new Date(),
              raw: { buttonText, ...rawPayload },
            },
          },
        },
        { new: true },
      )
      .exec();
  }
}
