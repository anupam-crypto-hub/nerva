import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { ApiKeyGuard } from '@modules/auth/guards/api-key.guard';
import { CurrentWorkspace, WorkspaceContext } from '@shared/common';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('api-key')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @ApiOperation({ summary: 'List webhooks' })
  async list(@CurrentWorkspace() workspace: WorkspaceContext) {
    return this.webhooksService.list(workspace.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a webhook' })
  async create(@CurrentWorkspace() workspace: WorkspaceContext, @Body() body: { url: string; events: string[] }) {
    return this.webhooksService.create(workspace.id, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  async update(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.webhooksService.update(workspace.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  async remove(@CurrentWorkspace() workspace: WorkspaceContext, @Param('id') id: string) {
    return this.webhooksService.delete(workspace.id, id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a test webhook' })
  async test(@CurrentWorkspace() workspace: WorkspaceContext, @Param('id') id: string) {
    return this.webhooksService.test(workspace.id, id);
  }
}
