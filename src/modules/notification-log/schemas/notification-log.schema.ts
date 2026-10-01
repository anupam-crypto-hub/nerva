import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type NotificationLogDocument = HydratedDocument<NotificationLog>;

@Schema({ _id: false })
export class StatusHistoryEntry {
  @Prop({ required: true })
  status: string;

  @Prop({ required: true, default: () => new Date() })
  timestamp: Date;

  @Prop({ type: MongooseSchema.Types.Mixed })
  raw?: Record<string, unknown>;
}

@Schema({ timestamps: true, collection: 'notification_logs' })
export class NotificationLog {
  @Prop({ required: true, index: true })
  sellerId: string;

  @Prop({ required: true })
  aggregatorSlug: string;

  @Prop({ required: true })
  agentType: string;

  @Prop({ required: true })
  channel: string;

  @Prop({ required: true, index: true })
  customerPhone: string;

  @Prop({ required: true })
  templateName: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  templateParams: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  requestPayload?: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  responsePayload?: Record<string, unknown>;

  @Prop({
    required: true,
    enum: ['queued', 'sent', 'delivered', 'read', 'failed', 'responded'],
    default: 'queued',
    index: true,
  })
  status: string;

  @Prop({ type: [Object], default: [] })
  statusHistory: StatusHistoryEntry[];

  @Prop()
  customerResponseAction?: string;

  @Prop()
  msg91RequestId?: string;

  @Prop()
  msg91Crqid?: string;

  @Prop()
  msg91Uuid?: string;

  @Prop()
  errorCode?: string;

  @Prop()
  errorReason?: string;

  @Prop({ index: true })
  sourceWebhookId?: string;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);
