import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redisUrl');
    this.client = new Redis(redisUrl || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 10) return null;
        return Math.min(times * 200, 5000);
      },
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis connected');
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ Redis connection error', err.message);
    });

    this.client.connect().catch((err) => {
      this.logger.warn('Redis initial connection deferred:', err.message);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  // ---- Cache Operations ----

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // ---- Distributed Lock ----

  async acquireLock(key: string, ttlSeconds: number = 30): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const result = await this.client.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    await this.client.del(`lock:${key}`);
  }

  // ---- Rate Limiting ----

  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    const rateLimitKey = `ratelimit:${key}`;
    const multi = this.client.multi();
    multi.incr(rateLimitKey);
    multi.expire(rateLimitKey, windowSeconds);
    const results = await multi.exec();
    return (results?.[0]?.[1] as number) || 0;
  }

  async getRateLimit(key: string): Promise<number> {
    const value = await this.client.get(`ratelimit:${key}`);
    return parseInt(value || '0', 10);
  }

  // ---- JSON Cache ----

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }
}
