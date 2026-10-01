import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { MongoConfig } from '@config/configuration';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const mongoConfig = configService.get<MongoConfig>('mongo');
        return {
          uri: mongoConfig?.uri,
          dbName: mongoConfig?.dbName,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
