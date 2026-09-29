// ============================================================
// Configuration Module — Validated Environment Variables
// ============================================================

export interface AppConfig {
  nodeEnv: string;
  apiPort: number;
  workerPort: number;
  apiVersion: string;

  // Database
  databaseUrl: string;
  dbName: string;

  // Redis
  redisHost: string;
  redisPort: number;
  redisPassword: string;
  redisUrl: string;

  // AWS
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;

  // Queue Provider
  queueProvider: string; // 'sqs' | 'n8n'
  n8nWebhookBaseUrl: string;

  // SQS
  sqsEndpoint?: string;
  sqsQueuePrefix: string;
  sqsEventProcessingQueue: string;
  sqsEventProcessingDlq: string;
  sqsWorkflowExecutionQueue: string;
  sqsWorkflowExecutionDlq: string;
  sqsCommunicationQueue: string;
  sqsCommunicationDlq: string;
  sqsConversationProcessingQueue: string;
  sqsConversationProcessingDlq: string;
  sqsAiProcessingQueue: string;
  sqsAiProcessingDlq: string;
  sqsWebhookDeliveryQueue: string;
  sqsWebhookDeliveryDlq: string;

  // AI
  aiProvider: string;
  aiApiKey: string;
  aiModel: string;
  aiMaxTokens: number;
  aiTemperature: number;

  // MSG91 — WhatsApp & SMS
  msg91WhatsappBaseUrl: string;

  msg91AuthKey: string;
  msg91IntegratedNumber: string;

  // SMTP
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;

  // Auth
  jwtSecret: string;
  apiKeySaltRounds: number;
  webhookSignatureSecret: string;

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  rateLimitEventsPerMinute: number;

  // Webhook Delivery
  webhookDeliveryTimeoutMs: number;
  webhookDeliveryMaxRetries: number;
  webhookDeliveryBackoffBaseMs: number;

  // Workflow
  workflowDefaultTimeoutHours: number;
  workflowMaxConcurrentExecutions: number;
  workflowStepRetryMax: number;

  // Logging
  logLevel: string;
  logFormat: string;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPort: parseInt(process.env.API_PORT || '5010', 10),
  workerPort: parseInt(process.env.WORKER_PORT || '5011', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  dbName: process.env.DB_NAME || 'notification_module',

  // Redis
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // AWS
  awsRegion: process.env.AWS_REGION || 'ap-south-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',

  // Queue Provider
  queueProvider: process.env.QUEUE_PROVIDER || 'sqs',
  n8nWebhookBaseUrl: process.env.N8N_WEBHOOK_BASE_URL || 'http://localhost:5678/webhook',

  // SQS
  sqsEndpoint: process.env.SQS_ENDPOINT,
  sqsQueuePrefix: process.env.SQS_QUEUE_PREFIX || 'notification-module',
  sqsEventProcessingQueue: process.env.SQS_EVENT_PROCESSING_QUEUE || 'notification-module-event-processing',
  sqsEventProcessingDlq: process.env.SQS_EVENT_PROCESSING_DLQ || 'notification-module-event-processing-dlq',
  sqsWorkflowExecutionQueue: process.env.SQS_WORKFLOW_EXECUTION_QUEUE || 'notification-module-workflow-execution',
  sqsWorkflowExecutionDlq: process.env.SQS_WORKFLOW_EXECUTION_DLQ || 'notification-module-workflow-execution-dlq',
  sqsCommunicationQueue: process.env.SQS_COMMUNICATION_QUEUE || 'notification-module-communication',
  sqsCommunicationDlq: process.env.SQS_COMMUNICATION_DLQ || 'notification-module-communication-dlq',
  sqsConversationProcessingQueue: process.env.SQS_CONVERSATION_PROCESSING_QUEUE || 'notification-module-conversation-processing',
  sqsConversationProcessingDlq: process.env.SQS_CONVERSATION_PROCESSING_DLQ || 'notification-module-conversation-processing-dlq',
  sqsAiProcessingQueue: process.env.SQS_AI_PROCESSING_QUEUE || 'notification-module-ai-processing',
  sqsAiProcessingDlq: process.env.SQS_AI_PROCESSING_DLQ || 'notification-module-ai-processing-dlq',
  sqsWebhookDeliveryQueue: process.env.SQS_WEBHOOK_DELIVERY_QUEUE || 'notification-module-webhook-delivery',
  sqsWebhookDeliveryDlq: process.env.SQS_WEBHOOK_DELIVERY_DLQ || 'notification-module-webhook-delivery-dlq',

  // AI
  aiProvider: process.env.AI_PROVIDER || 'openai',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
  aiMaxTokens: parseInt(process.env.AI_MAX_TOKENS || '1024', 10),
  aiTemperature: parseFloat(process.env.AI_TEMPERATURE || '0.1'),

  // MSG91 — WhatsApp & SMS
  msg91WhatsappBaseUrl: process.env.MSG91_WHATSAPP_BASE_URL || 'https://control.msg91.com/api/v5/whatsapp',

  msg91AuthKey: process.env.MSG91_AUTHKEY || '',
  msg91IntegratedNumber: process.env.MSG91_INTEGRATED_NUMBER || '',

  // SMTP
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  apiKeySaltRounds: parseInt(process.env.API_KEY_SALT_ROUNDS || '12', 10),
  webhookSignatureSecret: process.env.WEBHOOK_SIGNATURE_SECRET || 'change-me',

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  rateLimitEventsPerMinute: parseInt(process.env.RATE_LIMIT_EVENTS_PER_MINUTE || '500', 10),

  // Webhook Delivery
  webhookDeliveryTimeoutMs: parseInt(process.env.WEBHOOK_DELIVERY_TIMEOUT_MS || '10000', 10),
  webhookDeliveryMaxRetries: parseInt(process.env.WEBHOOK_DELIVERY_MAX_RETRIES || '5', 10),
  webhookDeliveryBackoffBaseMs: parseInt(process.env.WEBHOOK_DELIVERY_BACKOFF_BASE_MS || '1000', 10),

  // Workflow
  workflowDefaultTimeoutHours: parseInt(process.env.WORKFLOW_DEFAULT_TIMEOUT_HOURS || '24', 10),
  workflowMaxConcurrentExecutions: parseInt(process.env.WORKFLOW_MAX_CONCURRENT_EXECUTIONS || '100', 10),
  workflowStepRetryMax: parseInt(process.env.WORKFLOW_STEP_RETRY_MAX || '3', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
  logFormat: process.env.LOG_FORMAT || 'json',
});
