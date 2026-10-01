import { PartialType } from '@nestjs/swagger';
import { CreateAggregatorConfigDto } from './create-aggregator-config.dto';

export class UpdateAggregatorConfigDto extends PartialType(CreateAggregatorConfigDto) {}
