import { Injectable, Logger } from '@nestjs/common';
import { Msg91Service } from '@modules/agents/msg91/msg91.service';
import {
  INotificationAgent,
  NotificationPayload,
  NotificationResult,
} from './interfaces/notification-agent.interface';
import { NotificationAgent } from '@modules/seller-settings/schemas/seller-settings.schema';

export interface RouteResult {
  agentType: string;
  channel: string;
  result: NotificationResult;
}

@Injectable()
export class NotificationRouterService {
  private readonly logger = new Logger(NotificationRouterService.name);
  private readonly agentRegistry: Map<string, INotificationAgent>;

  constructor(private readonly msg91Service: Msg91Service) {
    // Register all available agents
    this.agentRegistry = new Map<string, INotificationAgent>();
    this.agentRegistry.set('msg91', this.msg91Service);
  }

  /**
   * Dispatches notifications to the pre-filtered list of seller agents.
   * Caller (CourierWebhookService) is responsible for INTERSECT filtering.
   */
  async routeNotification(
    sellerAgents: NotificationAgent[],
    payload: NotificationPayload,
  ): Promise<RouteResult[]> {
    if (sellerAgents.length === 0) {
      this.logger.warn('No agents provided for routing');
      return [];
    }

    // Sort by priority (lower = higher priority)
    const sortedAgents = [...sellerAgents].sort((a, b) => a.priority - b.priority);

    this.logger.log(
      `Routing to ${sortedAgents.length} agents: ${sortedAgents.map((a) => `${a.agentType}/${a.channel}`).join(', ')}`,
    );

    const results: RouteResult[] = [];

    for (const agent of sortedAgents) {
      const agentService = this.agentRegistry.get(agent.agentType);
      if (!agentService) {
        this.logger.warn(`No service registered for agent type: ${agent.agentType}`);
        results.push({
          agentType: agent.agentType,
          channel: agent.channel,
          result: { success: false, error: `Agent type not supported: ${agent.agentType}` },
        });
        continue;
      }

      const result = await agentService.sendTemplateMessage(
        agent.config as unknown as Record<string, unknown>,
        payload,
      );

      results.push({
        agentType: agent.agentType,
        channel: agent.channel,
        result,
      });
    }

    return results;
  }
}
