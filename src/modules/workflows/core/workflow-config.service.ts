import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/database';

@Injectable()
export class WorkflowConfigService {
  private readonly logger = new Logger(WorkflowConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get workflow config for a workspace, or return defaults.
   */
  async getConfig(workspaceId: string, workflowSlug: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { slug: workflowSlug },
    });
    if (!workflow) return null;

    const config = await this.prisma.workflowConfig.findFirst({
      where: { workspaceId, workflowId: workflow.id },
    });

    return config;
  }

  /**
   * Update workflow configuration for a workspace.
   */
  async updateConfig(
    workspaceId: string,
    workflowSlug: string,
    data: { enabled?: boolean; settings?: Record<string, any> },
  ) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { slug: workflowSlug },
    });
    if (!workflow) throw new NotFoundException({ errorCode: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });

    const existing = await this.prisma.workflowConfig.findFirst({
      where: { workspaceId, workflowId: workflow.id },
    });

    if (existing) {
      return this.prisma.workflowConfig.update({
        where: { id: existing.id },
        data: {
          enabled: data.enabled ?? existing.enabled,
          settings: (data.settings || existing.settings) as any,
        },
      });
    }

    return this.prisma.workflowConfig.create({
      data: {
        workspaceId,
        workflowId: workflow.id,
        enabled: data.enabled ?? true,
        settings: data.settings || this.getDefaultSettings(workflowSlug),
      },
    });
  }

  /**
   * Enable a workflow for a workspace.
   */
  async enableWorkflow(workspaceId: string, workflowId: string) {
    return this.updateConfigByWorkflowId(workspaceId, workflowId, { enabled: true });
  }

  /**
   * Disable a workflow for a workspace.
   */
  async disableWorkflow(workspaceId: string, workflowId: string) {
    return this.updateConfigByWorkflowId(workspaceId, workflowId, { enabled: false });
  }

  private async updateConfigByWorkflowId(
    workspaceId: string,
    workflowId: string,
    data: { enabled: boolean },
  ) {
    const existing = await this.prisma.workflowConfig.findFirst({
      where: { workspaceId, workflowId },
    });

    if (existing) {
      return this.prisma.workflowConfig.update({
        where: { id: existing.id },
        data: { enabled: data.enabled },
      });
    }

    const workflow = await this.prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new NotFoundException({ errorCode: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });

    return this.prisma.workflowConfig.create({
      data: {
        workspaceId,
        workflowId,
        enabled: data.enabled,
        settings: this.getDefaultSettings(workflow.slug),
      },
    });
  }

  private getDefaultSettings(slug: string): Record<string, any> {
    switch (slug) {
      case 'cod_order_confirmation':
        return {
          initial_message_delay_minutes: 0,
          reminder_delay_minutes: 30,
          final_reminder_delay_minutes: 120,
          expiration_hours: 24,
          max_retries: 2,
        };
      case 'address_verification':
        return {
          message_delay_minutes: 0,
          expiration_hours: 24,
          max_retries: 2,
        };
      case 'ndr_rescue':
        return {
          initial_contact_delay_minutes: 0,
          max_attempts: 3,
          expiration_hours: 48,
        };
      default:
        return {};
    }
  }
}
