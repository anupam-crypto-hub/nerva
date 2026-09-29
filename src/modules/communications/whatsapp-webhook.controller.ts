import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '@shared/sqs';
import { v4 as uuidv4 } from 'uuid';

/**
 * MSG91 inbound message payload.
 * Sent by MSG91 webhook "On Inbound Request Received".
 */
interface Msg91InboundPayload {
  direction: 'inbound';
  message_type: 'text' | 'interactive' | 'image' | 'document' | 'video' | 'audio' | 'location';
  customer_number: string;
  integrated_number: string;
  message_uuid: string;
  text?: string;
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  received_at?: string;
}

/**
 * MSG91 delivery report payload.
 * Sent by MSG91 webhook "On Outbound Report Received".
 */
interface Msg91StatusPayload {
  direction: 'outbound';
  status: 'Submitted' | 'Sent' | 'Delivered' | 'Read' | 'Failed';
  customer_number: string;
  integrated_number: string;
  message_uuid: string;
  message_type: string;
  template_name?: string;
  request_id?: string;
  submitted_at?: string;
  delivered_at?: string;
  read_at?: string;
  company_id?: number;
}

/**
 * WhatsApp webhook controller for receiving MSG91 callbacks.
 *
 * These endpoints are NOT guarded by ApiKeyGuard — MSG91 calls them
 * directly. We validate by checking the integrated_number matches
 * our configured number.
 *
 * Configure in MSG91 Dashboard → WhatsApp → Webhook (New):
 *   - "On Inbound Request Received"  → POST {your_domain}/v1/webhooks/whatsapp/inbound
 *   - "On Outbound Report Received"  → POST {your_domain}/v1/webhooks/whatsapp/status
 */
@ApiTags('WhatsApp Webhooks')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);
  private readonly integratedNumber: string;
  private readonly conversationQueue: string;

  constructor(
    private readonly config: ConfigService,
    private readonly queueService: QueueService,
  ) {
    this.integratedNumber = this.config.get<string>('msg91IntegratedNumber')!;
    this.conversationQueue = this.config.get<string>('sqsConversationProcessingQueue')!;
  }

  /**
   * Receive inbound WhatsApp messages from MSG91.
   * Handles: text messages, button replies, list replies.
   *
   * MSG91 expects a 200 response within 5-8 seconds.
   * We immediately acknowledge and push to SQS for async processing.
   */
  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MSG91 inbound WhatsApp message webhook' })
  async handleInbound(@Body() body: Msg91InboundPayload) {
    // Validate the message is for our number
    if (body.integrated_number !== this.integratedNumber) {
      this.logger.warn(`Ignoring inbound for unknown number: ${body.integrated_number}`);
      return { status: 'ignored' };
    }

    this.logger.log(
      `📩 Inbound ${body.message_type} from ${body.customer_number} (uuid: ${body.message_uuid})`,
    );

    // Extract the reply content based on message type
    const parsedContent = this.parseInboundContent(body);

    // Push to conversation-processing queue for async handling
    await this.queueService.sendMessage(this.conversationQueue, {
      type: 'whatsapp.inbound',
      data: {
        customerPhone: body.customer_number,
        integratedNumber: body.integrated_number,
        messageUuid: body.message_uuid,
        messageType: body.message_type,
        ...parsedContent,
        rawPayload: body,
      },
      metadata: {
        correlationId: uuidv4(),
        timestamp: new Date().toISOString(),
        source: 'msg91-webhook',
      },
    });

    // Return 200 immediately — MSG91 requires fast response
    return { status: 'received' };
  }

  /**
   * Receive outbound delivery reports from MSG91.
   * Tracks: Submitted, Sent, Delivered, Read, Failed.
   */
  @Post('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MSG91 outbound delivery status webhook' })
  async handleStatus(@Body() body: Msg91StatusPayload) {
    if (body.integrated_number !== this.integratedNumber) {
      this.logger.warn(`Ignoring status for unknown number: ${body.integrated_number}`);
      return { status: 'ignored' };
    }

    this.logger.log(
      `📊 DLR: ${body.status} for ${body.customer_number} (uuid: ${body.message_uuid})`,
    );

    // Push to conversation-processing queue for status tracking
    await this.queueService.sendMessage(this.conversationQueue, {
      type: 'whatsapp.status',
      data: {
        customerPhone: body.customer_number,
        messageUuid: body.message_uuid,
        status: body.status.toLowerCase(),
        templateName: body.template_name,
        requestId: body.request_id,
        submittedAt: body.submitted_at,
        deliveredAt: body.delivered_at,
        readAt: body.read_at,
      },
      metadata: {
        correlationId: uuidv4(),
        timestamp: new Date().toISOString(),
        source: 'msg91-webhook',
      },
    });

    return { status: 'received' };
  }

  /**
   * Parse the inbound message content into a normalized structure.
   */
  private parseInboundContent(body: Msg91InboundPayload): {
    text?: string;
    replyId?: string;
    replyTitle?: string;
    replyType?: string;
  } {
    switch (body.message_type) {
      case 'text':
        return { text: body.text };

      case 'interactive':
        if (body.interactive?.type === 'button_reply') {
          return {
            replyType: 'button',
            replyId: body.interactive.button_reply?.id,
            replyTitle: body.interactive.button_reply?.title,
          };
        }
        if (body.interactive?.type === 'list_reply') {
          return {
            replyType: 'list',
            replyId: body.interactive.list_reply?.id,
            replyTitle: body.interactive.list_reply?.title,
          };
        }
        return {};

      default:
        // For image, document, video, audio, location — pass through raw
        return { text: body.text };
    }
  }
}
