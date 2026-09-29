import { Module } from '@nestjs/common';
import { NdrService } from './ndr.service';
import { NdrController } from './ndr.controller';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [NdrController],
  providers: [NdrService],
  exports: [NdrService],
})
export class NdrModule {}
