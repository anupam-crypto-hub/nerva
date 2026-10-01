import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AggregatorConfig,
  AggregatorConfigDocument,
} from './schemas/aggregator-config.schema';
import { CreateAggregatorConfigDto } from './dto/create-aggregator-config.dto';
import { UpdateAggregatorConfigDto } from './dto/update-aggregator-config.dto';

@Injectable()
export class AggregatorConfigService {
  private readonly logger = new Logger(AggregatorConfigService.name);

  constructor(
    @InjectModel(AggregatorConfig.name)
    private readonly aggregatorModel: Model<AggregatorConfigDocument>,
  ) {}

  async create(dto: CreateAggregatorConfigDto): Promise<AggregatorConfigDocument> {
    this.logger.log(`Creating aggregator config: ${dto.slug}`);
    const created = new this.aggregatorModel(dto);
    return created.save();
  }

  async findAll(): Promise<AggregatorConfigDocument[]> {
    return this.aggregatorModel.find({ isActive: true }).exec();
  }

  async findBySlug(slug: string): Promise<AggregatorConfigDocument | null> {
    return this.aggregatorModel.findOne({ slug, isActive: true }).exec();
  }

  async update(
    slug: string,
    dto: UpdateAggregatorConfigDto,
  ): Promise<AggregatorConfigDocument> {
    const updated = await this.aggregatorModel
      .findOneAndUpdate({ slug }, { $set: dto }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Aggregator config not found: ${slug}`);
    }
    return updated;
  }

  async remove(slug: string): Promise<void> {
    const result = await this.aggregatorModel.deleteOne({ slug }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Aggregator config not found: ${slug}`);
    }
  }
}
