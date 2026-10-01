import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SellerSettings, SellerSettingsSchema } from './schemas/seller-settings.schema';
import { SellerSettingsService } from './seller-settings.service';
import { SellerSettingsController } from './seller-settings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SellerSettings.name, schema: SellerSettingsSchema },
    ]),
  ],
  controllers: [SellerSettingsController],
  providers: [SellerSettingsService],
  exports: [SellerSettingsService],
})
export class SellerSettingsModule {}
