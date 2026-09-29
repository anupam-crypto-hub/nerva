import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
  CreateQueueCommand,
  type Message as SQSMessage,
} from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';

export interface SqsMessagePayload {
  type: string;
  data: Record<string, any>;
  metadata: {
    correlationId: string;
    workspaceId?: string;
    timestamp: string;
    source?: string;
  };
}

@Injectable()
export class SqsService {
  private readonly logger = new Logger(SqsService.name);
  private readonly client: SQSClient;
  private readonly queueUrlCache = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('sqsEndpoint');
    const region = this.configService.get<string>('awsRegion') || 'ap-south-1';

    const config: any = {
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('awsAccessKeyId') || '',
        secretAccessKey: this.configService.get<string>('awsSecretAccessKey') || '',
      },
    };

    if (endpoint) {
      config.endpoint = endpoint;
    }

    this.client = new SQSClient(config);
    this.logger.log(`✅ SQS client initialized (region: ${region}${endpoint ? `, endpoint: ${endpoint}` : ''})`);
  }

  /**
   * Send a message to an SQS queue
   */
  async sendMessage(
    queueName: string,
    payload: SqsMessagePayload,
    delaySeconds: number = 0,
    deduplicationId?: string,
  ): Promise<string> {
    const queueUrl = await this.getQueueUrl(queueName);
    const messageId = uuidv4();

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
      DelaySeconds: delaySeconds,
      MessageAttributes: {
        MessageType: {
          DataType: 'String',
          StringValue: payload.type,
        },
        CorrelationId: {
          DataType: 'String',
          StringValue: payload.metadata.correlationId,
        },
      },
    });

    try {
      const result = await this.client.send(command);
      this.logger.debug(
        `Message sent to ${queueName}: ${payload.type} (${result.MessageId})`,
      );
      return result.MessageId || messageId;
    } catch (error) {
      this.logger.error(`Failed to send message to ${queueName}`, error);
      throw error;
    }
  }

  /**
   * Receive messages from an SQS queue (used by workers)
   */
  async receiveMessages(
    queueName: string,
    maxMessages: number = 10,
    waitTimeSeconds: number = 20,
    visibilityTimeout: number = 30,
  ): Promise<SQSMessage[]> {
    const queueUrl = await this.getQueueUrl(queueName);

    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds,
      VisibilityTimeout: visibilityTimeout,
      MessageAttributeNames: ['All'],
    });

    try {
      const result = await this.client.send(command);
      return result.Messages || [];
    } catch (error) {
      this.logger.error(`Failed to receive messages from ${queueName}`, error);
      throw error;
    }
  }

  /**
   * Delete a processed message from the queue
   */
  async deleteMessage(queueName: string, receiptHandle: string): Promise<void> {
    const queueUrl = await this.getQueueUrl(queueName);

    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });

    try {
      await this.client.send(command);
    } catch (error) {
      this.logger.error(`Failed to delete message from ${queueName}`, error);
      throw error;
    }
  }

  /**
   * Get the queue URL, with caching
   */
  private async getQueueUrl(queueName: string): Promise<string> {
    if (this.queueUrlCache.has(queueName)) {
      return this.queueUrlCache.get(queueName)!;
    }

    try {
      const command = new GetQueueUrlCommand({ QueueName: queueName });
      const result = await this.client.send(command);
      if (result.QueueUrl) {
        this.queueUrlCache.set(queueName, result.QueueUrl);
        return result.QueueUrl;
      }
    } catch (error: any) {
      // Queue doesn't exist yet — create it (development only)
      if (error.name === 'QueueDoesNotExist' || error.name === 'AWS.SimpleQueueService.NonExistentQueue') {
        this.logger.warn(`Queue ${queueName} not found, creating...`);
        return this.createQueue(queueName);
      }
      throw error;
    }

    throw new Error(`Could not resolve queue URL for ${queueName}`);
  }

  /**
   * Create a queue (for local development with ElasticMQ)
   */
  private async createQueue(queueName: string): Promise<string> {
    const command = new CreateQueueCommand({
      QueueName: queueName,
      Attributes: {
        VisibilityTimeout: '30',
        ReceiveMessageWaitTimeSeconds: '20',
      },
    });

    const result = await this.client.send(command);
    const queueUrl = result.QueueUrl!;
    this.queueUrlCache.set(queueName, queueUrl);
    this.logger.log(`Created queue: ${queueName}`);
    return queueUrl;
  }
}
