export interface NotificationPayload {
  customerPhone: string;
  templateName: string;
  templateParams: Record<string, string>;
}

export interface NotificationResult {
  success: boolean;
  requestId?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface INotificationAgent {
  readonly agentType: string;
  sendTemplateMessage(
    config: Record<string, unknown>,
    payload: NotificationPayload,
  ): Promise<NotificationResult>;
}
