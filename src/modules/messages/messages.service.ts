import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@shared/database';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    workspaceId: string; conversationId?: string; executionId?: string;
    direction: string; channel: string; from?: string; to: string;
    type: string; content: any; externalId?: string;
  }) {
    return this.prisma.message.create({ data });
  }

  async getById(workspaceId: string, id: string) {
    return this.prisma.message.findFirst({ where: { id, workspaceId } });
  }

  async updateStatus(id: string, status: string, externalId?: string) {
    const data: any = { status };
    if (externalId) data.externalId = externalId;
    if (status === 'SENT') data.sentAt = new Date();
    if (status === 'DELIVERED') data.deliveredAt = new Date();
    if (status === 'READ') data.readAt = new Date();
    if (status === 'FAILED') data.failedAt = new Date();
    return this.prisma.message.update({ where: { id }, data });
  }

  async findByExternalId(externalId: string) {
    return this.prisma.message.findFirst({ where: { externalId } });
  }
}
