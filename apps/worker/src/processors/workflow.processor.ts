import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqsConsumer, SqsService, SqsMessagePayload } from '@shared/sqs';
import { WorkflowExecutionService } from '@modules/workflows/core/workflow-execution.service';
import type { Message as SQSMessage } from '@aws-sdk/client-sqs';

@Injectable()
export class WorkflowProcessor extends SqsConsumer implements OnModuleInit {
  constructor(
    sqsService: SqsService,
    private readonly config: ConfigService,
    private readonly workflowExecution: WorkflowExecutionService,
  ) {
    super(sqsService, config.get<string>('sqsWorkflowExecutionQueue')!, 'WorkflowProcessor');
  }

  onModuleInit() {
    const provider = this.config.get<string>('queueProvider') || 'sqs';
    if (provider !== 'sqs') {
      this.logger.log(`⏭️ SQS consumer skipped (queue provider: ${provider})`);
      return;
    }
    this.start();
  }

  async processMessage(payload: SqsMessagePayload, _raw: SQSMessage): Promise<void> {
    const { executionId, workflowSlug, stepName } = payload.data;
    this.logger.log(`Executing workflow step: ${workflowSlug}/${stepName} (execution: ${executionId})`);

    await this.workflowExecution.executeStep(executionId, workflowSlug, stepName);
  }
}
