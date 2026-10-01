import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SellerSettings,
  SellerSettingsDocument,
} from './schemas/seller-settings.schema';
import { CreateSellerSettingsDto } from './dto/create-seller-settings.dto';
import { UpdateSellerSettingsDto } from './dto/update-seller-settings.dto';

@Injectable()
export class SellerSettingsService {
  private readonly logger = new Logger(SellerSettingsService.name);

  constructor(
    @InjectModel(SellerSettings.name)
    private readonly sellerSettingsModel: Model<SellerSettingsDocument>,
  ) {}

  async create(dto: CreateSellerSettingsDto): Promise<SellerSettingsDocument> {
    this.logger.log(`Creating seller settings for sellerId=${dto.sellerId}, aggregator=${dto.aggregatorSlug}`);
    const created = new this.sellerSettingsModel(dto);
    return created.save();
  }

  async findBySellerId(sellerId: string): Promise<SellerSettingsDocument[]> {
    return this.sellerSettingsModel.find({ sellerId, isActive: true }).exec();
  }

  async findBySellerAndAggregator(
    sellerId: string,
    aggregatorSlug: string,
  ): Promise<SellerSettingsDocument | null> {
    return this.sellerSettingsModel
      .findOne({ sellerId, aggregatorSlug, isActive: true })
      .exec();
  }

  async update(
    sellerId: string,
    dto: UpdateSellerSettingsDto,
  ): Promise<SellerSettingsDocument> {
    const updated = await this.sellerSettingsModel
      .findOneAndUpdate({ sellerId }, { $set: dto }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Seller settings not found for sellerId=${sellerId}`);
    }
    return updated;
  }

  async remove(sellerId: string): Promise<void> {
    const result = await this.sellerSettingsModel.deleteOne({ sellerId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Seller settings not found for sellerId=${sellerId}`);
    }
  }
}
