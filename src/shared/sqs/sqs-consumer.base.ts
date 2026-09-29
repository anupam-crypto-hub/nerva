import { Logger } from '@nestjs/common';
import { SqsService, SqsMessagePayload } from './sqs.service';
import type { Message as SQSMessage } from '@aws-sdk/client-sqs';

/**
 * Base class for SQS queue consumers (used by Worker processors).
 * Subclasses implement `processMessage()` with business logic.
 */
export abstract class SqsConsumer {
  protected readonly logger: Logger;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(
    protected readonly sqsService: SqsService,
    protected readonly queueName: string,
    loggerContext?: string,
  ) {
    this.logger = new Logger(loggerContext || this.constructor.name);
  }

  /**
   * Start polling the queue for messages
   */
  start(pollIntervalMs: number = 1000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.log(`🚀 Consumer started for queue: ${this.queueName}`);
    this.poll();
  }

  /**
   * Stop polling gracefully
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
    this.logger.log(`🛑 Consumer stopped for queue: ${this.queueName}`);
  }

  /**
   * Main polling loop
   */
  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        const messages = await this.sqsService.receiveMessages(
          this.queueName,
          10,    // max messages per batch
          20,    // long-poll wait time (seconds)
          30,    // visibility timeout (seconds)
        );

        if (messages.length > 0) {
          this.logger.debug(`Received ${messages.length} messages from ${this.queueName}`);
        }

        for (const message of messages) {
          await this.handleMessage(message);
        }
      } catch (error) {
        this.logger.error(`Error polling ${this.queueName}`, error);
        // Back off on errors
        await this.sleep(5000);
      }
    }
  }

  /**
   * Handle a single SQS message with error handling and deletion
   */
  private async handleMessage(message: SQSMessage): Promise<void> {
    const body = message.Body;
    if (!body) {
      this.logger.warn('Received empty message body');
      if (message.ReceiptHandle) {
        await this.sqsService.deleteMessage(this.queueName, message.ReceiptHandle);
      }
      return;
    }

    let payload: SqsMessagePayload;
    try {
      payload = JSON.parse(body);
    } catch {
      this.logger.error('Failed to parse message body', body);
      if (message.ReceiptHandle) {
        await this.sqsService.deleteMessage(this.queueName, message.ReceiptHandle);
      }
      return;
    }

    try {
      await this.processMessage(payload, message);

      // Delete message after successful processing
      if (message.ReceiptHandle) {
        await this.sqsService.deleteMessage(this.queueName, message.ReceiptHandle);
      }
    } catch (error) {
      this.logger.error(
        `Error processing message ${payload.type} (${payload.metadata.correlationId})`,
        error,
      );
      // Message will become visible again after visibility timeout → retry
      // After maxReceiveCount, SQS moves it to DLQ
    }
  }

  /**
   * Implement this in subclasses to handle business logic
   */
  abstract processMessage(
    payload: SqsMessagePayload,
    rawMessage: SQSMessage,
  ): Promise<void>;

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
