import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { CourierWebhookService } from './courier-webhook.service';
import { AggregatorAuthGuard } from '@modules/auth/guards/aggregator-auth.guard';

@ApiTags('Courier Webhooks')
@Controller('webhooks/courier')
export class CourierWebhookController {
  private readonly logger = new Logger(CourierWebhookController.name);

  constructor(private readonly courierWebhookService: CourierWebhookService) {}

  @Post(':aggregatorSlug')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AggregatorAuthGuard)
  @ApiOperation({ summary: 'Receive webhook from courier aggregator' })
  @ApiParam({ name: 'aggregatorSlug', example: 'quickflo' })
  async handleWebhook(
    @Param('aggregatorSlug') aggregatorSlug: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    this.logger.log(`Webhook received from aggregator: ${aggregatorSlug}`);

    // aggregatorConfig is attached to req by AggregatorAuthGuard
    const aggregatorConfig = req.aggregatorConfig;
    if (!aggregatorConfig) {
      throw new Error('AggregatorConfig not found on request — guard misconfigured');
    }

    return this.courierWebhookService.processWebhook(aggregatorConfig, body, req);
  }
}
