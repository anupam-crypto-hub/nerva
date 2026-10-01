import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { SellerSettingsService } from './seller-settings.service';
import { CreateSellerSettingsDto } from './dto/create-seller-settings.dto';
import { UpdateSellerSettingsDto } from './dto/update-seller-settings.dto';
import { ApiKeyGuard } from '@modules/auth/guards/api-key.guard';

@ApiTags('Seller Settings')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('sellers')
export class SellerSettingsController {
  constructor(private readonly sellerSettingsService: SellerSettingsService) {}

  @Post(':sellerId/settings')
  @ApiOperation({ summary: 'Create seller notification settings' })
  @ApiParam({ name: 'sellerId', example: 'seller_123' })
  create(
    @Param('sellerId') sellerId: string,
    @Body() dto: CreateSellerSettingsDto,
  ) {
    // Ensure sellerId from path matches body
    dto.sellerId = sellerId;
    return this.sellerSettingsService.create(dto);
  }

  @Get(':sellerId/settings')
  @ApiOperation({ summary: 'Get seller notification settings' })
  @ApiParam({ name: 'sellerId', example: 'seller_123' })
  findOne(@Param('sellerId') sellerId: string) {
    return this.sellerSettingsService.findBySellerId(sellerId);
  }

  @Patch(':sellerId/settings')
  @ApiOperation({ summary: 'Update seller notification settings' })
  @ApiParam({ name: 'sellerId', example: 'seller_123' })
  update(
    @Param('sellerId') sellerId: string,
    @Body() dto: UpdateSellerSettingsDto,
  ) {
    return this.sellerSettingsService.update(sellerId, dto);
  }

  @Delete(':sellerId/settings')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete seller notification settings' })
  @ApiParam({ name: 'sellerId', example: 'seller_123' })
  remove(@Param('sellerId') sellerId: string) {
    return this.sellerSettingsService.remove(sellerId);
  }
}
