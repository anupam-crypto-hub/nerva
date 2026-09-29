import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@shared/database';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    return this.prisma.messageTemplate.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(workspaceId: string, data: {
    name: string; channel: string; type: string;
    content: any; variables?: string[]; externalId?: string; language?: string;
  }) {
    return this.prisma.messageTemplate.create({
      data: { workspaceId, ...data, variables: data.variables || [] },
    });
  }

  async update(workspaceId: string, id: string, data: Partial<{
    name: string; content: any; variables: string[]; externalId: string; status: string;
  }>) {
    return this.prisma.messageTemplate.update({ where: { id }, data });
  }

  async getByName(workspaceId: string, name: string, channel: string) {
    return this.prisma.messageTemplate.findFirst({
      where: { workspaceId, name, channel },
    });
  }
}
