import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NotificationLogService } from './notification-log.service';

@ApiTags('Notification Logs')
@Controller('logs')
export class NotificationLogController {
  constructor(private readonly notificationLogService: NotificationLogService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get delivery stats' })
  getStats() {
    return this.notificationLogService.getStats();
  }

  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Get logs for a specific seller' })
  @ApiParam({ name: 'sellerId', example: 'seller_123' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  findBySeller(
    @Param('sellerId') sellerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationLogService.findBySellerId(sellerId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification log by ID' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.notificationLogService.findById(id);
  }
}
