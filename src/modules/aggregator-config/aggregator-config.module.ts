import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AggregatorConfig, AggregatorConfigSchema } from './schemas/aggregator-config.schema';
import { AggregatorConfigService } from './aggregator-config.service';
import { AggregatorConfigController } from './aggregator-config.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AggregatorConfig.name, schema: AggregatorConfigSchema },
    ]),
  ],
  controllers: [AggregatorConfigController],
  providers: [AggregatorConfigService],
  exports: [AggregatorConfigService],
})
export class AggregatorConfigModule {}
