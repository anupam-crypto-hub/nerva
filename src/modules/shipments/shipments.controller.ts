import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { ApiKeyGuard } from '@modules/auth/guards/api-key.guard';
import { CurrentWorkspace, WorkspaceContext } from '@shared/common';

@ApiTags('Shipments')
@Controller('shipments')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('api-key')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a shipment by ID' })
  async getShipment(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
  ) {
    return this.shipmentsService.getById(workspace.id, id);
  }
}
