import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/database';
import { QueueService } from '@shared/sqs';
import { RedisService } from '@shared/redis';
import { v4 as uuidv4 } from 'uuid';
import {
  DomainEvent,
  WorkflowContext,
  WorkflowResult,
  WorkflowStatus,
} from './workflow.interfaces';
import { WorkflowRegistryService } from './workflow-registry.service';

@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly registry: WorkflowRegistryService,
  ) {}

  /**
   * Process an event: find applicable workflows, create executions, and dispatch.
   */
  async processEventForWorkflows(event: DomainEvent, correlationId: string): Promise<void> {
    // Load workspace workflow configs
    const workflowConfigs = await this.prisma.workflowConfig.findMany({
      where: { workspaceId: event.workspaceId },
      include: { workflow: true },
    });

    // Build a context stub for canHandle checks
    const contextStub: WorkflowContext = {
      workspaceId: event.workspaceId,
      executionId: '',
      eventId: event.eventId,
      entityType: this.getEntityTypeFromEvent(event.type),
      entityId: '',
      correlationId,
      config: {},
      state: {},
    };

    // Find applicable workflows
    const applicable = await this.registry.findApplicableWorkflows(event, contextStub);

    for (const workflow of applicable) {
      // Check if workflow is enabled for this workspace
      const wfConfig = workflowConfigs.find(
        (c) => c.workflow.slug === workflow.slug,
      );
      if (wfConfig && !wfConfig.enabled) {
        this.logger.debug(
          `Workflow ${workflow.slug} is disabled for workspace ${event.workspaceId}`,
        );
        continue;
      }

      // Idempotency: check if an execution already exists for this event + workflow
      const existing = await this.prisma.workflowExecution.findFirst({
        where: {
          workspaceId: event.workspaceId,
          eventId: event.eventId,
          workflow: { slug: workflow.slug },
          status: { in: ['PENDING', 'RUNNING', 'WAITING'] },
        },
      });

      if (existing) {
        this.logger.debug(
          `Execution already exists for ${workflow.slug} + event ${event.eventId}`,
        );
        continue;
      }

      // Get or create the workflow record in DB
      let workflowRecord = await this.prisma.workflow.findUnique({
        where: { slug: workflow.slug },
      });
      if (!workflowRecord) {
        workflowRecord = await this.prisma.workflow.create({
          data: {
            name: workflow.name,
            slug: workflow.slug,
            description: workflow.description,
            eventTypes: workflow.eventTypes,
          },
        });
      }

      // Create execution
      const execution = await this.prisma.workflowExecution.create({
        data: {
          workspaceId: event.workspaceId,
          workflowId: workflowRecord.id,
          workflowVersion: workflow.version,
          eventId: event.eventId,
          entityType: this.getEntityTypeFromEvent(event.type),
          entityId: this.getEntityIdFromEvent(event),
          status: 'PENDING',
          currentStep: workflow.getInitialStep(),
          context: { eventData: event.data },
          correlationId,
        },
      });

      // Dispatch to workflow execution queue
      const queueName = this.config.get<string>('sqsWorkflowExecutionQueue')!;
      await this.queueService.sendMessage(queueName, {
        type: 'workflow.execute',
        data: {
          executionId: execution.id,
          workflowSlug: workflow.slug,
          stepName: workflow.getInitialStep(),
        },
        metadata: {
          correlationId,
          workspaceId: event.workspaceId,
          timestamp: new Date().toISOString(),
        },
      });

      this.logger.log(
        `Created execution ${execution.id} for workflow ${workflow.slug} (event: ${event.type})`,
      );
    }
  }

  /**
   * Execute a specific step of a workflow.
   */
  async executeStep(
    executionId: string,
    workflowSlug: string,
    stepName: string,
  ): Promise<void> {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: { workflow: true },
    });

    if (!execution) {
      this.logger.error(`Execution not found: ${executionId}`);
      return;
    }

    // Skip if already completed/cancelled/expired
    if (['COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(execution.status)) {
      this.logger.debug(`Execution ${executionId} already in terminal state: ${execution.status}`);
      return;
    }

    const workflow = this.registry.getWorkflow(workflowSlug);
    if (!workflow) {
      this.logger.error(`Workflow not found: ${workflowSlug}`);
      await this.updateExecution(executionId, 'FAILED', {
        code: 'WORKFLOW_NOT_FOUND',
        message: `Workflow ${workflowSlug} not registered`,
      });
      return;
    }

    // Load workspace config for this workflow
    const wfConfig = await this.prisma.workflowConfig.findFirst({
      where: { workspaceId: execution.workspaceId, workflowId: execution.workflowId },
    });

    // Build context
    const context: WorkflowContext = {
      workspaceId: execution.workspaceId,
      executionId: execution.id,
      eventId: execution.eventId || '',
      entityType: execution.entityType || '',
      entityId: execution.entityId || '',
      correlationId: execution.correlationId || '',
      config: (wfConfig?.settings as Record<string, any>) || {},
      state: (execution.context as Record<string, any>) || {},
    };

    // Check exit conditions
    const exitCheck = await workflow.shouldExit(context);
    if (exitCheck.exit) {
      this.logger.log(`Workflow ${workflowSlug} exiting: ${exitCheck.reason}`);
      await this.updateExecution(executionId, 'CANCELLED', undefined, {
        exit_reason: exitCheck.reason,
      });
      return;
    }

    // Mark as running
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: 'RUNNING', currentStep: stepName, startedAt: execution.startedAt || new Date() },
    });

    // Create step record
    const step = await this.prisma.workflowStep.create({
      data: {
        executionId,
        stepName,
        stepType: 'ACTION',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    try {
      // Execute the step
      const result = await workflow.executeStep(stepName, context);

      // Update step
      await this.prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          status: result.status === 'FAILED' ? 'FAILED' : 'COMPLETED',
          output: result.output,
          error: result.error,
          completedAt: new Date(),
        },
      });

      // Handle result
      switch (result.status) {
        case 'COMPLETED':
          await this.updateExecution(executionId, 'COMPLETED');
          // Emit any events
          if (result.emitEvents?.length) {
            for (const evt of result.emitEvents) {
              await this.emitInternalEvent(execution.workspaceId, evt.type, evt.data, context.correlationId);
            }
          }
          break;

        case 'WAITING':
          await this.prisma.workflowExecution.update({
            where: { id: executionId },
            data: {
              status: 'WAITING',
              currentStep: result.nextStep || stepName,
              context: { ...context.state, ...result.output },
            },
          });

          // Schedule next step if specified
          if (result.nextStep && result.scheduledAt) {
            const delaySeconds = Math.max(
              0,
              Math.floor((result.scheduledAt.getTime() - Date.now()) / 1000),
            );
            await this.scheduleStep(executionId, workflowSlug, result.nextStep, delaySeconds, context.correlationId, execution.workspaceId);
          }
          break;

        case 'FAILED':
          await this.updateExecution(executionId, 'FAILED', result.error);
          break;

        case 'CANCELLED':
          await this.updateExecution(executionId, 'CANCELLED');
          break;
      }
    } catch (error: any) {
      this.logger.error(`Step ${stepName} failed for execution ${executionId}`, error);
      await this.prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          status: 'FAILED',
          error: { message: error.message },
          completedAt: new Date(),
        },
      });
      await this.updateExecution(executionId, 'FAILED', {
        code: 'STEP_EXECUTION_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Resume a waiting workflow execution (e.g., when customer responds).
   */
  async resumeExecution(executionId: string, resumeData: Record<string, any>): Promise<void> {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: { workflow: true },
    });

    if (!execution || execution.status !== 'WAITING') {
      this.logger.warn(`Cannot resume execution ${executionId} — status: ${execution?.status}`);
      return;
    }

    // Update context with resume data
    const updatedContext = {
      ...((execution.context as Record<string, any>) || {}),
      ...resumeData,
    };

    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { context: updatedContext },
    });

    // Dispatch to workflow execution queue
    const queueName = this.config.get<string>('sqsWorkflowExecutionQueue')!;
    await this.queueService.sendMessage(queueName, {
      type: 'workflow.execute',
      data: {
        executionId: execution.id,
        workflowSlug: execution.workflow.slug,
        stepName: execution.currentStep || 'process_response',
      },
      metadata: {
        correlationId: execution.correlationId || '',
        workspaceId: execution.workspaceId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Get execution by ID.
   */
  async getExecution(workspaceId: string, executionId: string) {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, workspaceId },
      include: { workflow: true, steps: { orderBy: { createdAt: 'asc' } } },
    });
    if (!execution) throw new NotFoundException({ errorCode: 'EXECUTION_NOT_FOUND', message: 'Execution not found' });
    return execution;
  }

  /**
   * List executions for a workflow.
   */
  async listExecutions(workspaceId: string, workflowId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.workflowExecution.findMany({
        where: { workspaceId, workflowId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { steps: true },
      }),
      this.prisma.workflowExecution.count({ where: { workspaceId, workflowId } }),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ---- Private Helpers ----

  private async updateExecution(
    executionId: string,
    status: WorkflowStatus,
    error?: any,
    metadata?: any,
  ): Promise<void> {
    const data: any = { status };
    if (['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(status)) {
      data.completedAt = new Date();
    }
    if (error) data.error = error;
    if (metadata) data.metadata = metadata;

    await this.prisma.workflowExecution.update({ where: { id: executionId }, data });
  }

  private async scheduleStep(
    executionId: string,
    workflowSlug: string,
    stepName: string,
    delaySeconds: number,
    correlationId: string,
    workspaceId: string,
  ): Promise<void> {
    const queueName = this.config.get<string>('sqsWorkflowExecutionQueue')!;
    await this.queueService.sendMessage(
      queueName,
      {
        type: 'workflow.execute',
        data: { executionId, workflowSlug, stepName },
        metadata: {
          correlationId,
          workspaceId,
          timestamp: new Date().toISOString(),
        },
      },
      Math.min(delaySeconds, 900), // SQS max delay is 15 minutes
    );
  }

  private async emitInternalEvent(
    workspaceId: string,
    type: string,
    data: Record<string, any>,
    correlationId: string,
  ): Promise<void> {
    const eventId = `int_${uuidv4().replace(/-/g, '').substring(0, 20)}`;

    await this.prisma.event.create({
      data: {
        workspaceId,
        eventId,
        type,
        source: 'workflow-engine',
        occurredAt: new Date(),
        data,
        status: 'RECEIVED',
      },
    });

    const queueName = this.config.get<string>('sqsEventProcessingQueue')!;
    await this.queueService.sendMessage(queueName, {
      type: 'event.process',
      data: { eventId, eventType: type, workspaceId },
      metadata: { correlationId, workspaceId, timestamp: new Date().toISOString() },
    });

    this.logger.log(`Emitted internal event: ${type} (${eventId})`);
  }

  private getEntityTypeFromEvent(eventType: string): string {
    const prefix = eventType.split('.')[0]?.toUpperCase();
    return prefix || 'UNKNOWN';
  }

  private getEntityIdFromEvent(event: DomainEvent): string {
    const data = event.data;
    return (
      data.order?.id ||
      data.order?.external_order_id ||
      data.shipment?.id ||
      data.ndr?.id ||
      data.checkout?.id ||
      ''
    );
  }
}
