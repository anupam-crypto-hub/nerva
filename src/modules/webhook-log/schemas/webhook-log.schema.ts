import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type WebhookLogDocument = HydratedDocument<WebhookLog>;

@Schema({ timestamps: true, collection: 'webhook_logs' })
export class WebhookLog {
  @Prop({ required: true, enum: ['courier', 'msg91_outbound', 'msg91_inbound', 'seller_callback'] })
  source: string;

  @Prop()
  aggregatorSlug?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  headers: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  body: Record<string, unknown>;

  @Prop()
  ip: string;

  @Prop({
    required: true,
    enum: ['received', 'processed', 'failed'],
    default: 'received',
  })
  processingStatus: string;

  @Prop()
  processingError?: string;

  @Prop()
  processingDurationMs?: number;
}

export const WebhookLogSchema = SchemaFactory.createForClass(WebhookLog);
