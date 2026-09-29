import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@shared/database';
import { RedisService } from '@shared/redis';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.saltRounds = this.config.get<number>('apiKeySaltRounds') || 12;
  }

  /**
   * Create a new API key for a workspace.
   * Returns the raw key (only shown once — stored as hash).
   */
  async createApiKey(workspaceId: string, name: string, permissions?: string[]) {
    const clientId = `cli_${uuidv4().replace(/-/g, '').substring(0, 24)}`;
    const rawKey = `nk_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    const keyPrefix = rawKey.substring(0, 11); // "nk_" + first 8 chars
    const keyHash = await bcrypt.hash(rawKey, this.saltRounds);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        workspaceId,
        clientId,
        keyHash,
        keyPrefix,
        name,
        permissions: permissions || [
          'events:write',
          'events:read',
          'workflows:read',
          'workflows:write',
        ],
        status: 'ACTIVE',
      },
    });

    this.logger.log(`API key created: ${keyPrefix}... for workspace ${workspaceId}`);

    return {
      id: apiKey.id,
      clientId: apiKey.clientId,
      apiKey: rawKey, // Only returned on creation
      keyPrefix: apiKey.keyPrefix,
      name: apiKey.name,
      permissions: apiKey.permissions,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Validate an API key and return the associated workspace.
   */
  async validateApiKey(rawKey: string) {
    const keyPrefix = rawKey.substring(0, 11);

    // Check cache first
    const cachedData = await this.redis.getJson<{ workspaceId: string; apiKeyId: string; permissions: string[] }>(
      `apikey:${keyPrefix}`,
    );

    if (cachedData) {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: cachedData.workspaceId },
      });
      if (workspace && workspace.status === 'ACTIVE') {
        return {
          workspace,
          apiKey: { id: cachedData.apiKeyId, permissions: cachedData.permissions },
        };
      }
    }

    // Find candidate API keys by prefix
    const candidates = await this.prisma.apiKey.findMany({
      where: {
        keyPrefix,
        status: 'ACTIVE',
      },
    });

    for (const candidate of candidates) {
      const isValid = await bcrypt.compare(rawKey, candidate.keyHash);
      if (isValid) {
        // Check expiry
        if (candidate.expiresAt && candidate.expiresAt < new Date()) {
          throw new Error('API key expired');
        }

        const workspace = await this.prisma.workspace.findUnique({
          where: { id: candidate.workspaceId },
        });

        if (!workspace || workspace.status !== 'ACTIVE') {
          throw new Error('Workspace not found or inactive');
        }

        // Cache for 5 minutes
        await this.redis.setJson(
          `apikey:${keyPrefix}`,
          {
            workspaceId: workspace.id,
            apiKeyId: candidate.id,
            permissions: candidate.permissions,
          },
          300,
        );

        return {
          workspace,
          apiKey: { id: candidate.id, permissions: candidate.permissions },
        };
      }
    }

    throw new Error('Invalid API key');
  }

  /**
   * List API keys for a workspace (redacted — no hashes).
   */
  async listApiKeys(workspaceId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { workspaceId },
      select: {
        id: true,
        clientId: true,
        keyPrefix: true,
        name: true,
        permissions: true,
        status: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return keys;
  }

  /**
   * Revoke an API key.
   */
  async revokeApiKey(workspaceId: string, keyId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, workspaceId },
    });

    if (!apiKey) {
      throw new NotFoundException({
        errorCode: 'API_KEY_NOT_FOUND',
        message: 'API key not found',
      });
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { status: 'REVOKED' },
    });

    // Invalidate cache
    await this.redis.del(`apikey:${apiKey.keyPrefix}`);

    this.logger.log(`API key revoked: ${apiKey.keyPrefix}... in workspace ${workspaceId}`);
  }

  /**
   * Update the last used timestamp (fire-and-forget).
   */
  async updateLastUsed(apiKeyId: string) {
    await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { lastUsedAt: new Date() },
    });
  }
}
