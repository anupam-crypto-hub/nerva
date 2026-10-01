import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { BaseNotificationAgent } from '../base/notification-agent.base';
import {
  NotificationPayload,
  NotificationResult,
} from '@modules/notification-router/interfaces/notification-agent.interface';
import { Msg91Config } from '@config/configuration';

/**
 * MSG91 native to_and_components format.
 * Each body variable is keyed as "body_var_N" with a named parameter.
 */
interface Msg91BodyVar {
  type: 'text';
  value: string;
  parameter_name: string;
}

interface Msg91ButtonVar {
  subtype: 'url';
  type: 'text';
  value: string;
}

interface Msg91Components {
  [key: string]: Msg91BodyVar | Msg91ButtonVar;
}

interface Msg91SendPayload {
  integrated_number: string;
  content_type: 'template';
  payload: {
    messaging_product: 'whatsapp';
    type: 'template';
    template: {
      name: string;
      language: { code: string; policy: string };
      namespace: string | null;
      to_and_components: Array<{
        to: string[];
        components: Msg91Components;
      }>;
    };
  };
}

@Injectable()
export class Msg91Service extends BaseNotificationAgent {
  readonly agentType = 'msg91';
  private readonly globalConfig: Msg91Config;

  constructor(private readonly configService: ConfigService) {
    super(Msg91Service.name);
    this.globalConfig = this.configService.get<Msg91Config>('msg91') || {
      authkey: '',
      integratedNumber: '',
      baseUrl: 'https://control.msg91.com/api/v5/whatsapp',
    };
  }

  /**
   * Build MSG91 named body_var components from templateParams.
   *
   * Accepts two formats:
   *   1. Ordered values:  { customer_name: "Rahul", order_number: "ORD-123", ... }
   *      → body_var_1, body_var_2, ... (by insertion order)
   *   2. Explicit var keys: { var_1: "Rahul", var_2: "ORD-123", ... }
   *      → body_var_1, body_var_2, ... (by var index)
   */
  private buildComponents(templateParams: Record<string, string>): Msg91Components {
    const components: Msg91Components = {};
    const entries = Object.entries(templateParams);

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];

      // If key is already in var_N format, extract the index
      const varMatch = key.match(/^var_(\d+)$/);
      const varIndex = varMatch ? parseInt(varMatch[1], 10) : i + 1;
      const paramName = `var_${varIndex}`;

      components[`body_${paramName}`] = {
        type: 'text',
        value: String(value),
        parameter_name: paramName,
      };
    }

    return components;
  }

  async sendTemplateMessage(
    agentConfig: Record<string, unknown>,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    const authkey = (agentConfig['authkey'] as string) || this.globalConfig.authkey;
    const integratedNumber =
      (agentConfig['integratedNumber'] as string) || this.globalConfig.integratedNumber;

    // Build named body_var components
    const components = this.buildComponents(payload.templateParams);

    const msg91Payload: Msg91SendPayload = {
      integrated_number: integratedNumber,
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: payload.templateName,
          language: { code: 'en', policy: 'deterministic' },
          namespace: null,
          to_and_components: [
            {
              to: [payload.customerPhone],
              components,
            },
          ],
        },
      },
    };

    try {
      this.logger.log(
        `Sending MSG91 template "${payload.templateName}" to ${payload.customerPhone}`,
      );
      this.logger.debug(
        `MSG91 payload: ${JSON.stringify(msg91Payload)}`,
      );

      const response = await axios.post(
        `${this.globalConfig.baseUrl}/whatsapp-outbound-message/bulk/`,
        msg91Payload,
        {
          headers: {
            authkey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const requestId = response.data?.requestId || response.data?.request_id || '';

      return {
        success: true,
        requestId: String(requestId),
        rawResponse: response.data as Record<string, unknown>,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `MSG91 send failed: ${axiosError.message}`,
        axiosError.response?.data ? JSON.stringify(axiosError.response.data) : undefined,
      );
      return {
        success: false,
        error: axiosError.message,
        rawResponse: (axiosError.response?.data as Record<string, unknown>) || undefined,
      };
    }
  }
}
