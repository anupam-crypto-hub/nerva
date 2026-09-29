import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiKeyGuard } from '@modules/auth/guards/api-key.guard';
import { CurrentWorkspace, WorkspaceContext } from '@shared/common';
import { WorkflowRegistryService } from './core/workflow-registry.service';
import { WorkflowConfigService } from './core/workflow-config.service';
import { WorkflowExecutionService } from './core/workflow-execution.service';
import { PrismaService } from '@shared/database';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('api-key')
export class WorkflowsController {
  constructor(
    private readonly registry: WorkflowRegistryService,
    private readonly configService: WorkflowConfigService,
    private readonly executionService: WorkflowExecutionService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all available workflows' })
  async listWorkflows(@CurrentWorkspace() workspace: WorkspaceContext) {
    const workflows = await this.prisma.workflow.findMany({
      include: {
        configs: { where: { workspaceId: workspace.id } },
      },
    });

    return workflows.map((wf) => ({
      id: wf.id,
      name: wf.name,
      slug: wf.slug,
      description: wf.description,
      eventTypes: wf.eventTypes,
      enabled: wf.configs[0]?.enabled ?? true,
      config: wf.configs[0]?.settings || null,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow details' })
  async getWorkflow(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
  ) {
    const wf = await this.prisma.workflow.findUnique({
      where: { id },
      include: { configs: { where: { workspaceId: workspace.id } } },
    });
    if (!wf) return null;
    return {
      ...wf,
      enabled: wf.configs[0]?.enabled ?? true,
      workspaceConfig: wf.configs[0]?.settings || null,
    };
  }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Enable a workflow for this workspace' })
  async enableWorkflow(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
  ) {
    return this.configService.enableWorkflow(workspace.id, id);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable a workflow for this workspace' })
  async disableWorkflow(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
  ) {
    return this.configService.disableWorkflow(workspace.id, id);
  }

  @Get(':id/config')
  @ApiOperation({ summary: 'Get workflow configuration for this workspace' })
  async getConfig(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
  ) {
    const wf = await this.prisma.workflow.findUnique({ where: { id } });
    if (!wf) return null;
    return this.configService.getConfig(workspace.id, wf.slug);
  }

  @Put(':id/config')
  @ApiOperation({ summary: 'Update workflow configuration for this workspace' })
  async updateConfig(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
    @Body() body: { enabled?: boolean; settings?: Record<string, any> },
  ) {
    const wf = await this.prisma.workflow.findUnique({ where: { id } });
    if (!wf) return null;
    return this.configService.updateConfig(workspace.id, wf.slug, body);
  }
}

@ApiTags('Workflow Executions')
@Controller('executions')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('api-key')
export class ExecutionsController {
  constructor(private readonly executionService: WorkflowExecutionService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow execution by ID' })
  async getExecution(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
  ) {
    return this.executionService.getExecution(workspace.id, id);
  }
}
