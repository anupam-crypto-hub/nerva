import { Module } from '@nestjs/common';
import { Msg91Module } from './msg91/msg91.module';

@Module({
  imports: [Msg91Module],
  exports: [Msg91Module],
})
export class AgentsModule {}
