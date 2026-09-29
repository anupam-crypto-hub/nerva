import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { ApiKeyGuard } from '@modules/auth/guards/api-key.guard';
import { CurrentWorkspace, WorkspaceContext } from '@shared/common';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('api-key')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  async getOrder(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
  ) {
    return this.ordersService.getById(workspace.id, id);
  }
}
