import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Provider-independent communication interface.
 * All channels implement this contract.
 */
export interface CommunicationProvider {
  sendTemplate(to: string, templateName: string, params: Record<string, any>): Promise<MessageResult>;
  sendText(to: string, text: string): Promise<MessageResult>;
  sendInteractive(to: string, interactive: any): Promise<MessageResult>;
  sendMedia(to: string, mediaUrl: string, caption?: string): Promise<MessageResult>;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * WhatsApp provider using MSG91 API.
 * Replaces the direct Meta Cloud API integration with MSG91 as the BSP.
 *
 * MSG91 Endpoints:
 *   Template (bulk):  POST {baseUrl}/whatsapp-outbound-message/bulk/
 *   Session messages: POST {baseUrl}/whatsapp-outbound-message/
 */
@Injectable()
export class WhatsAppProvider implements CommunicationProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  private readonly baseUrl: string;
  private readonly authKey: string;
  private readonly integratedNumber: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('msg91WhatsappBaseUrl')!;
    this.authKey = this.config.get<string>('msg91AuthKey')!;
    this.integratedNumber = this.config.get<string>('msg91IntegratedNumber')!;
  }

  /**
   * Send a pre-approved WhatsApp template message via MSG91 bulk API.
   * Used to initiate conversations (COD confirmation, address verification, NDR rescue).
   *
   * @param to - Phone number (E.164 or 91XXXXXXXXXX)
   * @param templateName - Approved template name in MSG91/Meta
   * @param params - { language, components: { body_1: {type,value}, button_1: {type,value}, ... } }
   */
  async sendTemplate(to: string, templateName: string, params: Record<string, any>): Promise<MessageResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/whatsapp-outbound-message/bulk/`,
        {
          integrated_number: this.integratedNumber,
          content_type: 'template',
          payload: {
            type: 'template',
            template: {
              name: templateName,
              language: {
                code: params.language || 'en_US',
                policy: 'deterministic',
              },
              to_and_components: [
                {
                  to: [this.normalizePhone(to)],
                  components: params.components || {},
                },
              ],
            },
          },
        },
        { headers: this.getHeaders() },
      );

      return {
        success: true,
        messageId: response.data?.data?.request_id || response.data?.request_id,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.response?.data?.msg || error.message;
      this.logger.error(`MSG91 template send failed: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  /**
   * Send a plain text session message (within 24-hour window).
   */
  async sendText(to: string, text: string): Promise<MessageResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/whatsapp-outbound-message/`,
        {
          integrated_number: this.integratedNumber,
          content_type: 'text',
          payload: {
            to: this.normalizePhone(to),
            type: 'text',
            text: { body: text },
          },
        },
        { headers: this.getHeaders() },
      );

      return {
        success: true,
        messageId: response.data?.data?.request_id || response.data?.request_id,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message;
      this.logger.error(`MSG91 text send failed: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  /**
   * Send an interactive message (buttons or list) within session window.
   *
   * @param interactive - Full WhatsApp interactive object:
   *   { type: "button"|"list", body: {text}, action: {buttons:[...]} }
   */
  async sendInteractive(to: string, interactive: any): Promise<MessageResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/whatsapp-outbound-message/`,
        {
          integrated_number: this.integratedNumber,
          content_type: 'interactive',
          payload: {
            to: this.normalizePhone(to),
            type: 'interactive',
            interactive,
          },
        },
        { headers: this.getHeaders() },
      );

      return {
        success: true,
        messageId: response.data?.data?.request_id || response.data?.request_id,
      };
    } catch (error: any) {
      this.logger.error(`MSG91 interactive send failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a media message (image, video, document) within session window.
   */
  async sendMedia(to: string, mediaUrl: string, caption?: string): Promise<MessageResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/whatsapp-outbound-message/`,
        {
          integrated_number: this.integratedNumber,
          content_type: 'media',
          payload: {
            to: this.normalizePhone(to),
            type: 'image',
            image: { link: mediaUrl, caption },
          },
        },
        { headers: this.getHeaders() },
      );

      return {
        success: true,
        messageId: response.data?.data?.request_id || response.data?.request_id,
      };
    } catch (error: any) {
      this.logger.error(`MSG91 media send failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * MSG91 auth header — uses authkey instead of Bearer token.
   */
  private getHeaders() {
    return {
      authkey: this.authKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Normalize phone to digits-only format expected by MSG91 (e.g. "919876543210").
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }
}

/**
 * Communication service that routes to the appropriate provider.
 */
@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);
  private providers = new Map<string, CommunicationProvider>();

  constructor(private readonly whatsappProvider: WhatsAppProvider) {
    this.providers.set('whatsapp', whatsappProvider);
  }

  getProvider(channel: string): CommunicationProvider {
    const provider = this.providers.get(channel);
    if (!provider) throw new Error(`No provider configured for channel: ${channel}`);
    return provider;
  }

  async sendTemplate(channel: string, to: string, templateName: string, params: Record<string, any>) {
    return this.getProvider(channel).sendTemplate(to, templateName, params);
  }

  async sendText(channel: string, to: string, text: string) {
    return this.getProvider(channel).sendText(to, text);
  }

  async sendInteractive(channel: string, to: string, interactive: any) {
    return this.getProvider(channel).sendInteractive(to, interactive);
  }
}
