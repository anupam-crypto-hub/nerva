import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * MSG91 Inbound Webhook DTO
 * Received when a customer replies or clicks a button on a WhatsApp template.
 *
 * For order_confirmation, the `button` field contains:
 *   - "Confirm Order"
 *   - "Change Address"
 *   - "Update Phone"
 */
export class Msg91InboundWebhookDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  crqid?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requestedAt?: string;

  @ApiPropertyOptional({ description: 'Customer WhatsApp number (e.g. 919876543210)' })
  @IsString()
  @IsOptional()
  customerNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bsuid?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requestId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  uuid?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  integratedNumber?: string;

  @ApiPropertyOptional({ description: 'Template name that triggered this inbound' })
  @IsString()
  @IsOptional()
  templateName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campaignRequestId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  templateLanguage?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  replyMsgId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  conversationExpTimestamp?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pluginsource?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiPropertyOptional({ description: 'Text reply from customer (if free-text)' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  latitude?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  longitude?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  filename?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'Button text clicked by customer (e.g. "Confirm Order")' })
  @IsString()
  @IsOptional()
  button?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contacts?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reaction?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  interactive?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  orders?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  messageType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  messages?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  webhookType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ts?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cleverTapErrorCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cleverTapErrorReason?: string;
}
