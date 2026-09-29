import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@shared/database';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an auditable action. Fire-and-forget — never throws.
   */
  async log(data: {
    workspaceId: string;
    actor: string;          // SYSTEM, CUSTOMER, API, WORKFLOW
    action: string;         // ADDRESS_UPDATED, ORDER_CONFIRMED, etc.
    entityType: string;     // ORDER, CUSTOMER, SHIPMENT
    entityId: string;
    source?: string;        // WHATSAPP, API, WEBHOOK
    before?: any;
    after?: any;
    requestId?: string;
    correlationId?: string;
    executionId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data });
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
      // Never throw from audit — it's observability, not business logic
    }
  }

  /**
   * Query audit logs for an entity.
   */
  async getLogsForEntity(
    workspaceId: string,
    entityType: string,
    entityId: string,
    limit: number = 50,
  ) {
    return this.prisma.auditLog.findMany({
      where: { workspaceId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
