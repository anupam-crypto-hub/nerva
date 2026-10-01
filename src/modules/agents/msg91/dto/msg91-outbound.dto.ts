import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class Msg91OutboundWebhookDto {
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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  content?: string;

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
  eventName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  uuid?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  integratedNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  direction?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  templateName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campaignName?: string;

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
  contentType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  messageType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  webhookType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ts?: string;
}
