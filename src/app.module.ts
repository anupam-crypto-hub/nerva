import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigModule } from '@config/config.module';
import { DatabaseModule } from '@database/database.module';
import { HealthModule } from '@modules/health/health.module';
import { SellerSettingsModule } from '@modules/seller-settings/seller-settings.module';
import { AggregatorConfigModule } from '@modules/aggregator-config/aggregator-config.module';
import { WebhookLogModule } from '@modules/webhook-log/webhook-log.module';
import { NotificationLogModule } from '@modules/notification-log/notification-log.module';
import { AuthModule } from '@modules/auth/auth.module';
import { AgentsModule } from '@modules/agents/agents.module';
import { NotificationRouterModule } from '@modules/notification-router/notification-router.module';
import { CourierWebhookModule } from '@modules/courier-webhook/courier-webhook.module';
import { SellerCallbackModule } from '@modules/seller-callback/seller-callback.module';
import { RateLimitConfig, RedisConfig } from '@config/configuration';

@Module({
  imports: [
    // Core
    AppConfigModule,
    DatabaseModule,

    // Rate limiting
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const rateLimitConfig = configService.get<RateLimitConfig>('rateLimit');
        return [
          {
            ttl: rateLimitConfig?.windowMs || 60000,
            limit: rateLimitConfig?.maxRequests || 100,
          },
        ];
      },
      inject: [ConfigService],
    }),

    // BullMQ
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>('redis');
        return {
          connection: {
            host: redisConfig?.host || 'localhost',
            port: redisConfig?.port || 6379,
            password: redisConfig?.password || undefined,
          },
        };
      },
      inject: [ConfigService],
    }),

    // Feature modules
    HealthModule,
    SellerSettingsModule,
    AggregatorConfigModule,
    WebhookLogModule,
    NotificationLogModule,
    AuthModule,
    AgentsModule,
    NotificationRouterModule,
    CourierWebhookModule,
    SellerCallbackModule,
  ],
})
export class AppModule {}
