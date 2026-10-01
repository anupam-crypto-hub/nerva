export interface SellerCallbackCustomer {
  phone: string;
  name?: string;
}

export interface SellerCallbackMetadata {
  templateName?: string;
  buttonText?: string;
  msg91RequestId?: string;
  crqid?: string;
  inboundWebhookId?: string;
  originalNotificationLogId?: string;
  [key: string]: unknown;
}

export interface SellerCallbackPayload {
  event: string;
  action: string;
  timestamp: string;
  sellerId: string;
  aggregatorSlug?: string;
  orderNumber?: string;
  customer: SellerCallbackCustomer;
  metadata: SellerCallbackMetadata;
  rawInboundPayload?: Record<string, unknown>;
}

export interface SellerCallbackJobData {
  callbackUrl: string;
  sellerId: string;
  aggregatorSlug?: string;
  payload: SellerCallbackPayload;
  sourceWebhookId?: string;
  notificationLogId?: string;
}
