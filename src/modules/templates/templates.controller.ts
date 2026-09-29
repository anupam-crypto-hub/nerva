import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { ApiKeyGuard } from '@modules/auth/guards/api-key.guard';
import { CurrentWorkspace, WorkspaceContext } from '@shared/common';

@ApiTags('Templates')
@Controller('templates')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('api-key')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List message templates' })
  async list(@CurrentWorkspace() workspace: WorkspaceContext) {
    return this.templatesService.list(workspace.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a message template' })
  async create(@CurrentWorkspace() workspace: WorkspaceContext, @Body() body: any) {
    return this.templatesService.create(workspace.id, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a message template' })
  async update(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.templatesService.update(workspace.id, id, body);
  }
}
