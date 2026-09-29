import { Injectable, Logger } from '@nestjs/common';
import { WorkflowDefinition, DomainEvent, WorkflowContext } from './workflow.interfaces';

/**
 * Registry that maps event types to applicable workflows.
 * Workflows self-register and the registry routes events to them.
 */
@Injectable()
export class WorkflowRegistryService {
  private readonly logger = new Logger(WorkflowRegistryService.name);
  private readonly workflows = new Map<string, WorkflowDefinition>();
  private readonly eventToWorkflows = new Map<string, string[]>();

  /**
   * Register a workflow definition.
   */
  register(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.slug, workflow);

    for (const eventType of workflow.eventTypes) {
      const existing = this.eventToWorkflows.get(eventType) || [];
      if (!existing.includes(workflow.slug)) {
        existing.push(workflow.slug);
      }
      this.eventToWorkflows.set(eventType, existing);
    }

    this.logger.log(
      `Registered workflow: ${workflow.name} (${workflow.slug}) v${workflow.version} → [${workflow.eventTypes.join(', ')}]`,
    );
  }

  /**
   * Get all workflows that could potentially handle an event type.
   */
  getWorkflowsForEvent(eventType: string): WorkflowDefinition[] {
    const slugs = this.eventToWorkflows.get(eventType) || [];
    return slugs
      .map((slug) => this.workflows.get(slug))
      .filter(Boolean) as WorkflowDefinition[];
  }

  /**
   * Get a specific workflow by slug.
   */
  getWorkflow(slug: string): WorkflowDefinition | undefined {
    return this.workflows.get(slug);
  }

  /**
   * Get all registered workflows.
   */
  getAllWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Find applicable workflows for an event (calls canHandle on each).
   */
  async findApplicableWorkflows(
    event: DomainEvent,
    context: WorkflowContext,
  ): Promise<WorkflowDefinition[]> {
    const candidates = this.getWorkflowsForEvent(event.type);
    const applicable: WorkflowDefinition[] = [];

    for (const workflow of candidates) {
      try {
        const canHandle = await workflow.canHandle(event, context);
        if (canHandle) {
          applicable.push(workflow);
        }
      } catch (error) {
        this.logger.error(
          `Error checking canHandle for ${workflow.slug}: ${error}`,
        );
      }
    }

    return applicable;
  }
}
