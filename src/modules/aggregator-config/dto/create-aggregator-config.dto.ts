import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEnum,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AggregatorCredentialsDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  hmacSecret?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedIPs?: string[];
}

export class PayloadMappingDto {
  @ApiProperty({ example: 'data.seller_id' })
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ example: 'data.customer.phone' })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiProperty({ example: 'data.order.order_number' })
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @ApiProperty({ example: 'data.template.name' })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiProperty({ example: 'data.template.params' })
  @IsString()
  @IsNotEmpty()
  templateParams: string;
}

export class CreateAggregatorConfigDto {
  @ApiProperty({ example: 'quickflo' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'QuickFlo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['api_key', 'hmac', 'ip_whitelist', 'bearer_token'] })
  @IsEnum(['api_key', 'hmac', 'ip_whitelist', 'bearer_token'])
  authType: string;

  @ApiProperty({ type: AggregatorCredentialsDto })
  @ValidateNested()
  @Type(() => AggregatorCredentialsDto)
  @IsObject()
  credentials: AggregatorCredentialsDto;

  @ApiProperty({ example: ['msg91'] })
  @IsArray()
  @IsString({ each: true })
  enabledAgentTypes: string[];

  @ApiProperty({ example: ['whatsapp', 'sms'] })
  @IsArray()
  @IsString({ each: true })
  enabledChannels: string[];

  @ApiProperty({ type: PayloadMappingDto })
  @ValidateNested()
  @Type(() => PayloadMappingDto)
  @IsObject()
  payloadMapping: PayloadMappingDto;

  @ApiProperty({ example: ['order_confirmation'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  webhookEvents?: string[];

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
