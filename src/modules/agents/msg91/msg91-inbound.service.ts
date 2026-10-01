import { Injectable, Logger } from '@nestjs/common';
import { Msg91InboundWebhookDto } from './dto/msg91-inbound.dto';
import { NotificationLogService } from '@modules/notification-log/notification-log.service';
import { SellerSettingsService } from '@modules/seller-settings/seller-settings.service';
import { SellerCallbackService } from '@modules/seller-callback/seller-callback.service';
import { SellerCallbackPayload } from '@modules/seller-callback/interfaces/callback-payload.interface';
import { normalizePhone } from '@common/utils/phone.util';

/**
 * Standardized button actions from order_confirmation template.
 * The button text from MSG91 is normalized to these action types.
 */
export enum OrderConfirmationAction {
  CONFIRM_ORDER = 'CONFIRM_ORDER',
  CHANGE_ADDRESS = 'CHANGE_ADDRESS',
  UPDATE_PHONE = 'UPDATE_PHONE',
  UNKNOWN = 'UNKNOWN',
}

export interface InboundProcessingResult {
  action: OrderConfirmationAction;
  customerPhone: string;
  templateName: string;
  buttonText: string;
  rawPayload: Record<string, unknown>;
  sellerId?: string;
  aggregatorSlug?: string;
  orderNumber?: string;
  sellerNotified: boolean;
  callbackUrl?: string;
}

@Injectable()
export class Msg91InboundService {
  private readonly logger = new Logger(Msg91InboundService.name);

  constructor(
    private readonly notificationLogService: NotificationLogService,
    private readonly sellerSettingsService: SellerSettingsService,
    private readonly sellerCallbackService: SellerCallbackService,
  ) {}

  /**
   * Normalize button text from MSG91 to a standard action enum.
   *
   * MSG91 delivers the exact button label the customer clicked.
   * We normalize to a machine-readable action.
   */
  normalizeButtonAction(buttonText: string): OrderConfirmationAction {
    const normalized = buttonText.trim().toLowerCase();

    if (normalized.includes('confirm')) {
      return OrderConfirmationAction.CONFIRM_ORDER;
    }
    if (normalized.includes('address') || normalized.includes('change address')) {
      return OrderConfirmationAction.CHANGE_ADDRESS;
    }
    if (normalized.includes('phone') || normalized.includes('update phone')) {
      return OrderConfirmationAction.UPDATE_PHONE;
    }

    return OrderConfirmationAction.UNKNOWN;
  }

  /**
   * Process an inbound MSG91 webhook for order confirmation button clicks.
   *
   * Flow:
   *   1. Parse & log inbound payload
   *   2. Normalize button text → action enum
   *   3. Look up original notification by customerNumber + templateName (or requestId / crqid)
   *   4. Update notification log status to 'responded' and record button action
   *   5. Look up seller settings to get seller's callbackUrl
   *   6. Dispatch callback payload to seller via SellerCallbackService (BullMQ queue + direct fallback)
   *   7. Return processed result
   */
  async processInbound(
    dto: Msg91InboundWebhookDto,
    inboundWebhookId?: string,
  ): Promise<InboundProcessingResult> {
    const buttonText = dto.button || dto.text || '';
    const action = this.normalizeButtonAction(buttonText);
    const customerPhone = normalizePhone(dto.customerNumber || '');
    const templateName = dto.templateName || '';

    this.logger.log(
      `Inbound from ${customerPhone}: button="${buttonText}" → action=${action}, template=${templateName}`,
    );

    // Build the initial result
    const result: InboundProcessingResult = {
      action,
      customerPhone,
      templateName,
      buttonText,
      rawPayload: dto as unknown as Record<string, unknown>,
      sellerNotified: false,
    };

    // Log action-specific handling
    switch (action) {
      case OrderConfirmationAction.CONFIRM_ORDER:
        this.logger.log(`✅ Order CONFIRMED by ${customerPhone}`);
        break;

      case OrderConfirmationAction.CHANGE_ADDRESS:
        this.logger.log(`📍 Address change requested by ${customerPhone}`);
        break;

      case OrderConfirmationAction.UPDATE_PHONE:
        this.logger.log(`📞 Phone update requested by ${customerPhone}`);
        break;

      default:
        this.logger.warn(
          `Unknown button action from ${customerPhone}: "${buttonText}"`,
        );
    }

    // Step 3: Find original outbound notification log
    const notificationLog = await this.notificationLogService.findByPhoneAndTemplate(
      customerPhone,
      templateName || undefined,
      { requestId: dto.requestId, crqid: dto.crqid },
    );

    if (!notificationLog) {
      this.logger.warn(
        `No previous notification log found for customer=${customerPhone}, template=${templateName}. Cannot route callback to seller.`,
      );
      return result;
    }

    const logId = notificationLog._id.toString();
    result.sellerId = notificationLog.sellerId;
    result.aggregatorSlug = notificationLog.aggregatorSlug;

    // Extract orderNumber from templateParams or requestPayload if available
    const orderNumber =
      notificationLog.templateParams?.order_number ||
      notificationLog.templateParams?.orderNumber ||
      notificationLog.templateParams?.var_2 ||
      ((notificationLog.requestPayload as Record<string, unknown>)?.['orderNumber'] as string) ||
      '';
    result.orderNumber = orderNumber;

    // Record response on the notification log
    await this.notificationLogService.recordInboundResponse(
      logId,
      action,
      buttonText,
      dto as unknown as Record<string, unknown>,
    );

    // Step 4: Look up seller settings for callback URL
    let sellerSettings = await this.sellerSettingsService.findBySellerAndAggregator(
      notificationLog.sellerId,
      notificationLog.aggregatorSlug,
    );

    if (!sellerSettings) {
      const sellers = await this.sellerSettingsService.findBySellerId(notificationLog.sellerId);
      if (sellers && sellers.length > 0) {
        sellerSettings = sellers[0];
      }
    }

    if (!sellerSettings || !sellerSettings.callbackUrl) {
      this.logger.log(
        `Seller ${notificationLog.sellerId} has no callbackUrl configured. Skipping callback.`,
      );
      return result;
    }

    result.callbackUrl = sellerSettings.callbackUrl;

    // Build standardized seller callback payload
    const callbackPayload: SellerCallbackPayload = {
      event: 'order_confirmation.response',
      action,
      timestamp: new Date().toISOString(),
      sellerId: notificationLog.sellerId,
      aggregatorSlug: notificationLog.aggregatorSlug,
      orderNumber,
      customer: {
        phone: customerPhone,
        name:
          dto.customerName ||
          notificationLog.templateParams?.customer_name ||
          notificationLog.templateParams?.customerName ||
          notificationLog.templateParams?.var_1 ||
          '',
      },
      metadata: {
        templateName,
        buttonText,
        msg91RequestId: dto.requestId || notificationLog.msg91RequestId,
        crqid: dto.crqid || notificationLog.msg91Crqid,
        inboundWebhookId,
        originalNotificationLogId: logId,
      },
      rawInboundPayload: dto as unknown as Record<string, unknown>,
    };

    // Step 5: Enqueue seller callback
    await this.sellerCallbackService.sendCallback({
      callbackUrl: sellerSettings.callbackUrl,
      sellerId: notificationLog.sellerId,
      aggregatorSlug: notificationLog.aggregatorSlug,
      payload: callbackPayload,
      sourceWebhookId: inboundWebhookId,
      notificationLogId: logId,
    });

    result.sellerNotified = true;
    this.logger.log(
      `Triggered callback to seller ${notificationLog.sellerId} at ${sellerSettings.callbackUrl}`,
    );

    return result;
  }
}
