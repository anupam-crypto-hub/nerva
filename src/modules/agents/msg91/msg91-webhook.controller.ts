import { Controller, Post, Body, Req, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { Msg91OutboundWebhookDto } from './dto/msg91-outbound.dto';
import { Msg91InboundWebhookDto } from './dto/msg91-inbound.dto';
import { Msg91InboundService, InboundProcessingResult } from './msg91-inbound.service';
import { NotificationLogService } from '@modules/notification-log/notification-log.service';
import { WebhookLogService } from '@modules/webhook-log/webhook-log.service';

@ApiTags('MSG91 Webhooks')
@Controller('webhooks/msg91')
export class Msg91WebhookController {
  private readonly logger = new Logger(Msg91WebhookController.name);

  constructor(
    private readonly notificationLogService: NotificationLogService,
    private readonly webhookLogService: WebhookLogService,
    private readonly inboundService: Msg91InboundService,
  ) {}

  /**
   * MSG91 outbound delivery status webhook (DLR).
   * Receives delivery reports: SUBMITTED, SENT, DELIVERED, READ, FAILED, REJECTED.
   */
  @Post('outbound')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MSG91 outbound delivery status webhook' })
  async handleOutboundWebhook(
    @Body() dto: Msg91OutboundWebhookDto,
  ): Promise<{ status: string }> {
    this.logger.log(
      `MSG91 outbound webhook: event=${dto.eventName}, requestId=${dto.requestId}`,
    );

    // Log the raw webhook
    await this.webhookLogService.create({
      source: 'msg91_outbound',
      headers: {},
      body: dto as unknown as Record<string, unknown>,
      ip: '',
    });

    // Map MSG91 eventName to our status
    const statusMap: Record<string, string> = {
      SUBMITTED: 'sent',
      SENT: 'sent',
      DELIVERED: 'delivered',
      READ: 'read',
      FAILED: 'failed',
      REJECTED: 'failed',
    };

    const mappedStatus = statusMap[dto.eventName || ''];
    const status = mappedStatus || 'queued';

    if (!mappedStatus) {
      this.logger.warn(`Unknown MSG91 event name: ${dto.eventName}`);
    }

    // Update notification log if we have a requestId
    if (dto.requestId) {
      await this.notificationLogService.updateStatusByMsg91RequestId(
        dto.requestId,
        status,
        dto as unknown as Record<string, unknown>,
        { crqid: dto.crqid, uuid: dto.uuid },
      );
    }

    return { status: 'ok' };
  }

  /**
   * MSG91 inbound webhook — customer replies / button clicks.
   *
   * For order_confirmation template, the `button` field contains:
   *   - "Confirm Order"   → action: CONFIRM_ORDER
   *   - "Change Address"  → action: CHANGE_ADDRESS
   *   - "Update Phone"    → action: UPDATE_PHONE
   *
   * Fast ACK: returns 200 immediately.
   */
  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MSG91 inbound webhook — customer button clicks & replies' })
  async handleInboundWebhook(
    @Body() dto: Msg91InboundWebhookDto,
    @Req() req: Request,
  ): Promise<{
    status: string;
    action: string;
    sellerNotified?: boolean;
    sellerId?: string;
  }> {
    this.logger.log(
      `MSG91 inbound webhook: customer=${dto.customerNumber}, button="${dto.button}", template=${dto.templateName}`,
    );

    // Log the raw inbound webhook
    const webhookLog = await this.webhookLogService.create({
      source: 'msg91_inbound',
      headers: req.headers as Record<string, string>,
      body: dto as unknown as Record<string, unknown>,
      ip: req.ip || '',
    });

    // Process the inbound message and trigger seller callback
    const result: InboundProcessingResult = await this.inboundService.processInbound(
      dto,
      webhookLog._id.toString(),
    );

    return {
      status: 'ok',
      action: result.action,
      sellerNotified: result.sellerNotified || false,
      sellerId: result.sellerId,
    };
  }
}
