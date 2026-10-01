import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationAgentConfigDto {
  @ApiProperty({ example: '535413A3KImk8Xysg6a3bc16fP1' })
  @IsString()
  @IsNotEmpty()
  authkey: string;

  @ApiProperty({ example: '918890921925' })
  @IsString()
  @IsNotEmpty()
  integratedNumber: string;

  @ApiProperty({ example: 'order_confirmation_cod' })
  @IsString()
  @IsNotEmpty()
  defaultTemplateName: string;
}

export class NotificationAgentDto {
  @ApiProperty({ enum: ['msg91', 'twilio', 'gupshup'] })
  @IsEnum(['msg91', 'twilio', 'gupshup'])
  agentType: string;

  @ApiProperty({ enum: ['whatsapp', 'sms', 'email'] })
  @IsEnum(['whatsapp', 'sms', 'email'])
  channel: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiProperty({ type: NotificationAgentConfigDto })
  @ValidateNested()
  @Type(() => NotificationAgentConfigDto)
  config: NotificationAgentConfigDto;
}

export class CreateSellerSettingsDto {
  @ApiProperty({ example: 'seller_123', required: false })
  @IsString()
  @IsOptional()
  sellerId: string;

  @ApiProperty({ example: 'Acme Store' })
  @IsString()
  @IsNotEmpty()
  sellerName: string;

  @ApiProperty({ example: 'quickflo' })
  @IsString()
  @IsNotEmpty()
  aggregatorSlug: string;

  @ApiProperty({ example: 'https://api.quickflo.ai/webhooks/nerva/order-response', required: false })
  @IsString()
  @IsOptional()
  callbackUrl?: string;

  @ApiProperty({ type: [NotificationAgentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationAgentDto)
  notificationAgents: NotificationAgentDto[];
}
