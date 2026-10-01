import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type SellerSettingsDocument = HydratedDocument<SellerSettings>;

@Schema({ _id: false })
export class NotificationAgentConfig {
  @Prop({ required: true })
  authkey: string;

  @Prop({ required: true })
  integratedNumber: string;

  @Prop({ required: true })
  defaultTemplateName: string;
}

@Schema({ _id: false })
export class NotificationAgent {
  @Prop({ required: true, enum: ['msg91', 'twilio', 'gupshup'] })
  agentType: string;

  @Prop({ required: true, enum: ['whatsapp', 'sms', 'email'] })
  channel: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: 1 })
  priority: number;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  config: NotificationAgentConfig;
}

const NotificationAgentSchema = SchemaFactory.createForClass(NotificationAgent);

@Schema({ timestamps: true, collection: 'seller_settings' })
export class SellerSettings {
  @Prop({ required: true, index: true })
  sellerId: string;

  @Prop({ required: true })
  sellerName: string;

  @Prop({ required: true, index: true })
  aggregatorSlug: string;

  @Prop({ required: false })
  callbackUrl?: string;

  @Prop({ type: [NotificationAgentSchema], default: [] })
  notificationAgents: NotificationAgent[];

  @Prop({ default: true })
  isActive: boolean;
}

export const SellerSettingsSchema = SchemaFactory.createForClass(SellerSettings);

// Compound index: sellerId + aggregatorSlug must be unique
SellerSettingsSchema.index({ sellerId: 1, aggregatorSlug: 1 }, { unique: true });
