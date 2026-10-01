import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type AggregatorConfigDocument = HydratedDocument<AggregatorConfig>;

@Schema({ _id: false })
export class AggregatorCredentials {
  @Prop()
  apiKey?: string;

  @Prop()
  hmacSecret?: string;

  @Prop({ type: [String], default: [] })
  allowedIPs?: string[];
}

@Schema({ _id: false })
export class PayloadMapping {
  @Prop({ required: true })
  sellerId: string;

  @Prop({ required: true })
  customerPhone: string;

  @Prop({ required: true })
  orderNumber: string;

  @Prop({ required: true })
  templateName: string;

  @Prop({ required: true })
  templateParams: string;
}

@Schema({ timestamps: true, collection: 'aggregator_configs' })
export class AggregatorConfig {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['api_key', 'hmac', 'ip_whitelist', 'bearer_token'] })
  authType: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  credentials: AggregatorCredentials;

  @Prop({ type: [String], required: true })
  enabledAgentTypes: string[];

  @Prop({ type: [String], required: true })
  enabledChannels: string[];

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payloadMapping: PayloadMapping;

  @Prop({ type: [String], default: ['order_confirmation'] })
  webhookEvents: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const AggregatorConfigSchema = SchemaFactory.createForClass(AggregatorConfig);
