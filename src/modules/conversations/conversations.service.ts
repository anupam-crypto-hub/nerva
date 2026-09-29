import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@shared/database';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(workspaceId: string, customerId: string, channel: string, channelId: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { workspaceId, customerId, channel, channelId, status: 'ACTIVE' },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { workspaceId, customerId, channel, channelId, status: 'ACTIVE' },
    });
  }

  async getById(workspaceId: string, id: string) {
    return this.prisma.conversation.findFirst({
      where: { id, workspaceId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 50 }, states: { where: { isActive: true } } },
    });
  }

  async getByCustomerId(workspaceId: string, customerId: string) {
    return this.prisma.conversation.findMany({
      where: { workspaceId, customerId },
      orderBy: { updatedAt: 'desc' },
      include: { states: { where: { isActive: true } } },
    });
  }

  async setConversationState(conversationId: string, data: {
    workflowSlug: string; executionId: string; state: string; context?: any;
  }) {
    // Deactivate old states for this workflow
    await this.prisma.conversationState.updateMany({
      where: { conversationId, workflowSlug: data.workflowSlug, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.conversationState.create({
      data: { conversationId, ...data, isActive: true },
    });
  }

  async getActiveState(conversationId: string) {
    return this.prisma.conversationState.findFirst({
      where: { conversationId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveConversationByPhone(phone: string) {
    return this.prisma.conversation.findFirst({
      where: { channelId: phone, status: 'ACTIVE' },
      include: {
        states: { where: { isActive: true } },
        customer: true,
        workspace: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
