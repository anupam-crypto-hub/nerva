export interface NormalizedCourierPayload {
  sellerId: string;
  event: string;
  customerPhone: string;
  orderNumber: string;
  templateName: string;
  templateParams: Record<string, string>;
  rawPayload: Record<string, unknown>;
}
