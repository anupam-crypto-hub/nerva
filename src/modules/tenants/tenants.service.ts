import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@shared/database';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---- Organizations ----

  async createOrganization(data: { name: string; metadata?: any }) {
    return this.prisma.organization.create({ data });
  }

  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { workspaces: true },
    });
    if (!org) throw new NotFoundException({ errorCode: 'ORG_NOT_FOUND', message: 'Organization not found' });
    return org;
  }

  // ---- Workspaces ----

  async createWorkspace(data: {
    organizationId: string;
    name: string;
    slug: string;
    settings?: any;
  }) {
    const existing = await this.prisma.workspace.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new ConflictException({ errorCode: 'WORKSPACE_SLUG_EXISTS', message: `Workspace slug '${data.slug}' already exists` });
    }

    return this.prisma.workspace.create({ data });
  }

  async getWorkspace(id: string) {
    const ws = await this.prisma.workspace.findUnique({ where: { id } });
    if (!ws) throw new NotFoundException({ errorCode: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found' });
    return ws;
  }

  async getWorkspaceBySlug(slug: string) {
    const ws = await this.prisma.workspace.findUnique({ where: { slug } });
    if (!ws) throw new NotFoundException({ errorCode: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found' });
    return ws;
  }

  async listWorkspaces(organizationId: string) {
    return this.prisma.workspace.findMany({
      where: { organizationId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
