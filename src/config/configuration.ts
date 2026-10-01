export interface AppConfig {
  port: number;
  apiPrefix: string;
  nodeEnv: string;
  baseUrl: string;
}

export interface MongoConfig {
  uri: string;
  dbName: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
}

export interface BullConfig {
  concurrency: number;
  maxRetries: number;
  retryBackoffMs: number;
}

export interface Msg91Config {
  authkey: string;
  integratedNumber: string;
  baseUrl: string;
}

export interface AuthConfig {
  adminApiKey: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface NervaConfig {
  app: AppConfig;
  mongo: MongoConfig;
  redis: RedisConfig;
  bull: BullConfig;
  msg91: Msg91Config;
  auth: AuthConfig;
  rateLimit: RateLimitConfig;
}

export default (): NervaConfig => ({
  app: {
    port: parseInt(process.env.PORT || '5010', 10),
    apiPrefix: process.env.API_PREFIX || 'v1',
    nodeEnv: process.env.NODE_ENV || 'development',
    baseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || '5010'}`,
  },
  mongo: {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.DB_NAME || 'nerva',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  bull: {
    concurrency: parseInt(process.env.BULL_QUEUE_CONCURRENCY || '50', 10),
    maxRetries: parseInt(process.env.BULL_MAX_RETRIES || '3', 10),
    retryBackoffMs: parseInt(process.env.BULL_RETRY_BACKOFF_MS || '2000', 10),
  },
  msg91: {
    authkey: process.env.MSG91_AUTHKEY || '',
    integratedNumber: process.env.MSG91_INTEGRATED_NUMBER || '',
    baseUrl: process.env.MSG91_BASE_URL || 'https://control.msg91.com/api/v5/whatsapp',
  },
  auth: {
    adminApiKey: process.env.ADMIN_API_KEY || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
});
