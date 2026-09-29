import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/database';
import { QueueService } from '@shared/sqs';
import { RedisService } from '@shared/redis';
import { v4 as uuidv4 } from 'uuid';
import { EventRegistry } from './event-registry';

export interface CreateEventDto {
  event_id: string;
  type: string;
  occurred_at: string;
  source?: string;
  data: Record<string, any>;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly eventRegistry: EventRegistry,
  ) {}

  /**
   * Ingest an event: validate → idempotency check → persist → publish SQS → return 202.
   */
  async ingestEvent(workspaceId: string, dto: CreateEventDto, correlationId: string) {
    // 1. Validate event type
    if (!this.eventRegistry.isValidEventType(dto.type)) {
      throw new BadRequestException({
        errorCode: 'INVALID_EVENT_TYPE',
        message: `Unknown event type: ${dto.type}. Valid types: ${this.eventRegistry.getEventTypes().join(', ')}`,
      });
    }

    // 2. Idempotency check (workspace_id + event_id must be unique)
    const existingEvent = await this.prisma.event.findUnique({
      where: {
        workspaceId_eventId: {
          workspaceId,
          eventId: dto.event_id,
        },
      },
    });

    if (existingEvent) {
      this.logger.warn(
        `Duplicate event detected: ${dto.event_id} in workspace ${workspaceId}`,
      );
      // Return success but don't reprocess — idempotent
      return {
        event_id: dto.event_id,
        status: 'accepted',
        duplicate: true,
      };
    }

    // 3. Persist the event
    const event = await this.prisma.event.create({
      data: {
        workspaceId,
        eventId: dto.event_id,
        type: dto.type,
        source: dto.source,
        occurredAt: new Date(dto.occurred_at),
        data: dto.data,
        status: 'RECEIVED',
      },
    });

    // 4. Log event received
    await this.prisma.eventLog.create({
      data: {
        workspaceId,
        eventId: dto.event_id,
        action: 'RECEIVED',
        correlationId,
        details: { type: dto.type, source: dto.source },
      },
    });

    // 5. Publish to SQS for async processing
    const queueName = this.config.get<string>('sqsEventProcessingQueue')!;
    await this.queueService.sendMessage(queueName, {
      type: 'event.process',
      data: {
        eventDbId: event.id,
        eventId: dto.event_id,
        eventType: dto.type,
        workspaceId,
      },
      metadata: {
        correlationId,
        workspaceId,
        timestamp: new Date().toISOString(),
        source: dto.source,
      },
    });

    // 6. Log published
    await this.prisma.eventLog.create({
      data: {
        workspaceId,
        eventId: dto.event_id,
        action: 'PUBLISHED',
        correlationId,
      },
    });

    this.logger.log(
      `Event ingested: ${dto.type} (${dto.event_id}) for workspace ${workspaceId}`,
    );

    return {
      event_id: dto.event_id,
      status: 'accepted',
    };
  }

  /**
   * Get an event by its database ID.
   */
  async getEvent(workspaceId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        workspaceId,
      },
    });

    if (!event) {
      return null;
    }

    return event;
  }

  /**
   * Mark an event as processed.
   */
  async markEventProcessed(eventDbId: string) {
    await this.prisma.event.update({
      where: { id: eventDbId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark an event as failed.
   */
  async markEventFailed(eventDbId: string, error: any) {
    await this.prisma.event.update({
      where: { id: eventDbId },
      data: {
        status: 'FAILED',
        error: { message: error.message || String(error), stack: error.stack },
      },
    });
  }
}
