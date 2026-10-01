import { Logger } from '@nestjs/common';
import {
  INotificationAgent,
  NotificationPayload,
  NotificationResult,
} from '@modules/notification-router/interfaces/notification-agent.interface';

export abstract class BaseNotificationAgent implements INotificationAgent {
  protected readonly logger: Logger;
  abstract readonly agentType: string;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  abstract sendTemplateMessage(
    config: Record<string, unknown>,
    payload: NotificationPayload,
  ): Promise<NotificationResult>;
}
