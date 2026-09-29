/**
 * Core workflow interfaces.
 * All workflows implement these contracts.
 */

export interface DomainEvent {
  id: string;
  workspaceId: string;
  eventId: string;
  type: string;
  data: Record<string, any>;
  occurredAt: Date;
}

export interface WorkflowContext {
  workspaceId: string;
  executionId: string;
  eventId: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  config: Record<string, any>;
  state: Record<string, any>;
}

export interface WorkflowResult {
  status: 'COMPLETED' | 'WAITING' | 'FAILED' | 'CANCELLED';
  nextStep?: string;
  scheduledAt?: Date;
  output?: Record<string, any>;
  error?: { code: string; message: string };
  emitEvents?: Array<{ type: string; data: Record<string, any> }>;
}

export interface WorkflowDefinition {
  name: string;
  slug: string;
  description: string;
  version: number;
  eventTypes: string[];

  /**
   * Check if this workflow should handle the given event.
   * Returns false to skip (e.g., prepaid order for COD workflow).
   */
  canHandle(event: DomainEvent, context: WorkflowContext): Promise<boolean>;

  /**
   * Check if the workflow should be cancelled based on current state.
   * Called before each step to check exit conditions.
   */
  shouldExit(context: WorkflowContext): Promise<{ exit: boolean; reason?: string }>;

  /**
   * Execute the current step of the workflow.
   */
  executeStep(stepName: string, context: WorkflowContext): Promise<WorkflowResult>;

  /**
   * Get the initial step name.
   */
  getInitialStep(): string;
}

export type WorkflowStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';
