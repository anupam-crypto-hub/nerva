import { Module } from '@nestjs/common';
import { AggregatorConfigModule } from '@modules/aggregator-config/aggregator-config.module';
import { ApiKeyGuard } from './guards/api-key.guard';
import { AggregatorAuthGuard } from './guards/aggregator-auth.guard';

@Module({
  imports: [AggregatorConfigModule],
  providers: [ApiKeyGuard, AggregatorAuthGuard],
  exports: [ApiKeyGuard, AggregatorAuthGuard, AggregatorConfigModule],
})
export class AuthModule {}
