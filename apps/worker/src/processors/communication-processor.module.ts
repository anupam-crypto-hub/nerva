import { Module } from '@nestjs/common';
import { CommunicationProcessor } from './communication.processor';
@Module({ providers: [CommunicationProcessor] })
export class CommunicationProcessorModule {}
