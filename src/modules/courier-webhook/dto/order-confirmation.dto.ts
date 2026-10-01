import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CourierWebhookPayloadDto {
  @ApiProperty({ example: 'seller_123' })
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ example: 'order_confirmation' })
  @IsString()
  @IsNotEmpty()
  event: string;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  order?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  customer?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  template?: Record<string, unknown>;
}
