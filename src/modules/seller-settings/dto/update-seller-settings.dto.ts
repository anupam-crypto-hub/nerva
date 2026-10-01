import { PartialType } from '@nestjs/swagger';
import { CreateSellerSettingsDto } from './create-seller-settings.dto';

export class UpdateSellerSettingsDto extends PartialType(CreateSellerSettingsDto) {}
